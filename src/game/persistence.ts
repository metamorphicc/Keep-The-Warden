import {
  CLOUD_SAVE_KEY,
  MAX_OFFLINE_HOURS,
  NEEDS,
  NEED_ORDER,
  SAVE_KEY_LEGACY,
  SAVE_KEY_PREFIX,
  SAVE_VERSION,
  freshSave,
  sanitizeName,
} from './config'
import type { Needs, SaveData } from './types'
import { clamp } from './util'
import {
  cloudAvailable,
  cloudGet,
  cloudRemove,
  cloudSet,
  tgUserId,
} from '../telegram/telegram'

export interface LoadResult {
  save: SaveData
  /** ms since the previous session (0 for a brand new save) */
  awayMs: number
  fresh: boolean
}

/* ==========================================================================
   Where the save lives

   localStorage is namespaced by Telegram account id, so a shared device gives
   each player their own warden. Telegram's CloudStorage holds a copy of the
   same JSON against the player's account, which is what makes progress follow
   them to another phone — there is still no server of ours anywhere.
   ========================================================================== */

function localKey(): string {
  const id = tgUserId()
  return `${SAVE_KEY_PREFIX}${id === null ? 'guest' : id}`
}

function readKey(key: string): Partial<SaveData> | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(key)
  } catch {
    return null // private mode / storage disabled — play in-memory
  }
  if (!raw) return null
  return parseSave(raw)
}

function parseSave(raw: string): Partial<SaveData> | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? (parsed as Partial<SaveData>) : null
  } catch {
    return null
  }
}

/** `lastVisit` as it was found on disk — used to decide if the cloud is newer. */
let localSavedAt = 0

/**
 * Reads the save, repairs anything missing/corrupt, then applies the decay the
 * warden suffered while the app was closed. Offline decay is capped so a long
 * absence is survivable.
 */
export function loadSave(now: number): LoadResult {
  const base = freshSave(now)

  // The namespaced key wins. Falling back to the old flat key adopts a save
  // made before per-account namespacing existed — once, and only if this
  // account has nothing of its own yet.
  const input = readKey(localKey()) ?? readKey(SAVE_KEY_LEGACY)
  if (!input) {
    localSavedAt = 0
    return { save: base, awayMs: 0, fresh: true }
  }

  const save = migrate(input, base)
  localSavedAt = save.lastVisit
  const awayMs = Math.max(0, now - save.lastVisit)

  save.needs = applyDecay(save.needs, awayMs)
  save.lastVisit = now
  save.visits += 1

  return { save, awayMs, fresh: false }
}

/** Merge an unknown-shaped payload onto a fresh save, field by field. */
function migrate(input: Partial<SaveData>, base: SaveData): SaveData {
  const needs = { ...base.needs }
  if (input.needs && typeof input.needs === 'object') {
    for (const key of NEED_ORDER) {
      const v = (input.needs as Partial<Needs>)[key]
      if (typeof v === 'number' && Number.isFinite(v)) needs[key] = clamp(v)
    }
  }

  const larder: Record<string, number> = {}
  if (input.larder && typeof input.larder === 'object') {
    for (const [k, v] of Object.entries(input.larder)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        larder[k] = Math.floor(v)
      }
    }
  }

  return {
    version: SAVE_VERSION,
    // Saves written before v4 have no name at all.
    name: typeof input.name === 'string' ? sanitizeName(input.name) : base.name,
    needs,
    coins: num(input.coins, base.coins),
    shards: num(input.shards, base.shards),
    larder: Object.keys(larder).length ? larder : base.larder,
    owned: Array.isArray(input.owned)
      ? Array.from(new Set([...base.owned, ...input.owned.filter((x) => typeof x === 'string')]))
      : base.owned,
    look: {
      head: str(input.look?.head, base.look.head),
      cloak: str(input.look?.cloak, base.look.cloak),
      blade: str(input.look?.blade, base.look.blade),
    },
    lastVisit: num(input.lastVisit, base.lastVisit),
    firstVisit: num(input.firstVisit, base.firstVisit),
    visits: num(input.visits, base.visits),
    stats: { ...base.stats, ...(input.stats ?? {}) },
    settings: { ...base.settings, ...(input.settings ?? {}) },
  }
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function str(v: unknown, fallback: string | null): string | null {
  return typeof v === 'string' ? v : v === null ? null : fallback
}

/** Needs after `elapsedMs` of neglect. */
export function applyDecay(needs: Needs, elapsedMs: number): Needs {
  const hours = Math.min(elapsedMs / 3_600_000, MAX_OFFLINE_HOURS)
  if (hours <= 0) return needs
  const out = { ...needs }
  for (const key of NEED_ORDER) {
    out[key] = clamp(out[key] - NEEDS[key].decayPerHour * hours)
  }
  return out
}

/* ==========================================================================
   Writing
   ========================================================================== */

let saveTimer: number | undefined

/** Debounced write. Call `flushSave` when the app is about to disappear. */
export function scheduleSave(get: () => SaveData): void {
  if (saveTimer !== undefined) return
  saveTimer = window.setTimeout(() => {
    saveTimer = undefined
    writeSave(get())
  }, 500)
}

export function flushSave(data: SaveData): void {
  if (saveTimer !== undefined) {
    clearTimeout(saveTimer)
    saveTimer = undefined
  }
  writeSave(data, true)
}

export function writeSave(data: SaveData, immediateCloud = false): void {
  const payload: SaveData = {
    version: SAVE_VERSION,
    name: data.name,
    needs: data.needs,
    coins: data.coins,
    shards: data.shards,
    larder: data.larder,
    owned: data.owned,
    look: data.look,
    lastVisit: Date.now(),
    firstVisit: data.firstVisit,
    visits: data.visits,
    stats: data.stats,
    settings: data.settings,
  }
  const json = JSON.stringify(payload)

  try {
    localStorage.setItem(localKey(), json)
  } catch {
    // out of quota or storage blocked — nothing we can do, keep playing
  }

  queueCloudWrite(json, immediateCloud)
}

export function clearSave(): void {
  try {
    localStorage.removeItem(localKey())
    // Drop the pre-namespacing key too, or it gets adopted all over again.
    localStorage.removeItem(SAVE_KEY_LEGACY)
  } catch {
    /* ignore */
  }
  if (cloudTimer !== undefined) {
    clearTimeout(cloudTimer)
    cloudTimer = undefined
  }
  pendingCloud = null
  void cloudRemove(CLOUD_SAVE_KEY)
}

/* ==========================================================================
   Cloud sync

   Writes are debounced far harder than the local ones — this goes over the
   Telegram bridge, and losing the last few seconds of a session costs nothing
   we cannot recompute from the clock. Nothing is sent until the initial pull
   has settled, so a fresh install can never stamp on a good cloud save.
   ========================================================================== */

const CLOUD_DEBOUNCE = 12_000

let cloudTimer: number | undefined
let pendingCloud: string | null = null
let cloudGateOpen = false

function queueCloudWrite(json: string, immediate: boolean): void {
  if (!cloudAvailable()) return
  pendingCloud = json
  if (!cloudGateOpen) return

  if (immediate) {
    if (cloudTimer !== undefined) {
      clearTimeout(cloudTimer)
      cloudTimer = undefined
    }
    flushCloud()
    return
  }
  if (cloudTimer !== undefined) return
  cloudTimer = window.setTimeout(() => {
    cloudTimer = undefined
    flushCloud()
  }, CLOUD_DEBOUNCE)
}

function flushCloud(): void {
  const json = pendingCloud
  pendingCloud = null
  if (json) void cloudSet(CLOUD_SAVE_KEY, json)
}

/**
 * Reads the account-wide copy. Resolves with a save only when it is genuinely
 * newer than what this device had — otherwise null, and the local save stands.
 * Opening the write gate is the caller's job (`releaseCloudWrites`), so a slow
 * or missing response cannot silently discard the cloud copy.
 */
export async function pullCloudSave(now: number): Promise<LoadResult | null> {
  if (!cloudAvailable()) return null

  const raw = await cloudGet(CLOUD_SAVE_KEY)
  const input = raw ? parseSave(raw) : null
  if (!input) return null

  const save = migrate(input, freshSave(now))
  // A second of slack: the same device round-tripping its own save is not news.
  if (save.lastVisit <= localSavedAt + 1000) return null

  const awayMs = Math.max(0, now - save.lastVisit)
  save.needs = applyDecay(save.needs, awayMs)
  save.lastVisit = now
  save.visits += 1
  localSavedAt = now

  return { save, awayMs, fresh: false }
}

/** Lets queued cloud writes through. Call once the initial pull has settled. */
export function releaseCloudWrites(): void {
  if (cloudGateOpen) return
  cloudGateOpen = true
  if (pendingCloud) queueCloudWrite(pendingCloud, true)
}
