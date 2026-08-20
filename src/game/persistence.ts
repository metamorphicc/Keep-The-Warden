import {
  CLOUD_SAVE_KEY,
  MARKET_BY_ID,
  MAX_OFFLINE_HOURS,
  OFFLINE_FLOOR,
  SAVE_KEY_LEGACY,
  SAVE_KEY_PREFIX,
  SAVE_VERSION,
  STATS,
  STAT_ORDER,
  freshSave,
  sanitizeName,
} from './config'
import type { MarketState, SaveData, Stats } from './types'
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
   each player their own trader. Telegram's CloudStorage holds a copy of the
   same JSON against the player's account, which is what makes progress follow
   them to another phone — there is still no server of ours anywhere.

   Nothing here is money. It is a JSON blob with a fake cash figure in it.
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
 * Reads the save, repairs anything missing/corrupt, then applies the drift that
 * happened while the app was closed. Offline drift is capped so a long absence
 * is survivable.
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

  save.stats = applyDrift(save.stats, awayMs)
  save.lastVisit = now
  save.visits += 1

  return { save, awayMs, fresh: false }
}

/**
 * Merge an unknown-shaped payload onto a fresh save, field by field.
 *
 * This is also the v4 → v5 path. A pre-Quantum-Pit save has `needs`, `coins`,
 * `shards` and `larder`, none of which mean anything now, so they are simply
 * not read — the trader half comes out fresh. What does carry over is the part
 * that is still his: the name, the rig he owns, what he is wearing, and how
 * long you have been at this.
 */
function migrate(input: Partial<SaveData>, base: SaveData): SaveData {
  const stats = { ...base.stats }
  if (input.stats && typeof input.stats === 'object') {
    for (const key of STAT_ORDER) {
      const v = (input.stats as Partial<Stats>)[key]
      if (typeof v === 'number' && Number.isFinite(v)) stats[key] = clamp(v)
    }
  }

  const stash: Record<string, number> = {}
  if (input.stash && typeof input.stash === 'object') {
    for (const [k, v] of Object.entries(input.stash)) {
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
        stash[k] = Math.floor(v)
      }
    }
  }

  const bankroll = Math.max(0, num(input.bankroll, base.bankroll))

  return {
    version: SAVE_VERSION,
    // Saves written before v4 have no name at all. The old default name is
    // presentation debt, not a player choice, so it follows the new character.
    name: readName(input.name, base.name),
    stats,
    bankroll,
    peakBankroll: Math.max(bankroll, num(input.peakBankroll, base.peakBankroll)),
    credits: Math.max(0, num(input.credits, base.credits)),
    stash: Object.keys(stash).length ? stash : base.stash,
    owned: Array.isArray(input.owned)
      ? Array.from(new Set([...base.owned, ...input.owned.filter((x) => typeof x === 'string')]))
      : base.owned,
    look: {
      head: str(input.look?.head, base.look.head),
      cloak: str(input.look?.cloak, base.look.cloak),
      blade: str(input.look?.blade, base.look.blade),
    },
    markets: readMarkets(input.markets),
    marketsAt: num(input.marketsAt, base.marketsAt),
    hedgeUntil: num(input.hedgeUntil, base.hedgeUntil),
    lastVisit: num(input.lastVisit, base.lastVisit),
    firstVisit: num(input.firstVisit, base.firstVisit),
    visits: num(input.visits, base.visits),
    tally: { ...base.tally, ...(input.tally ?? {}) },
    settings: { ...base.settings, ...(input.settings ?? {}) },
  }
}

/** Quotes are only kept for questions that still exist in this build. */
function readMarkets(input: unknown): MarketState[] {
  if (!Array.isArray(input)) return []
  const out: MarketState[] = []
  for (const row of input) {
    if (!row || typeof row !== 'object') continue
    const { id, prob, quotedAt } = row as Partial<MarketState>
    if (typeof id !== 'string' || !MARKET_BY_ID[id]) continue
    if (typeof prob !== 'number' || !Number.isFinite(prob)) continue
    out.push({
      id,
      prob: Math.min(0.99, Math.max(0.01, prob)),
      quotedAt: typeof quotedAt === 'number' && Number.isFinite(quotedAt) ? quotedAt : 0,
    })
  }
  return out
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function readName(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback
  const name = sanitizeName(v)
  return name === 'Old Halvard' ? fallback : name
}

function str(v: unknown, fallback: string | null): string | null {
  return typeof v === 'string' ? v : v === null ? null : fallback
}

/** Stats after `elapsedMs` of neglect. Heat cools; everything else erodes. */
export function applyDrift(stats: Stats, elapsedMs: number): Stats {
  const hours = Math.min(elapsedMs / 3_600_000, MAX_OFFLINE_HOURS)
  if (hours <= 0) return stats
  const out = { ...stats }
  for (const key of STAT_ORDER) {
    const drifted = clamp(out[key] - STATS[key].driftPerHour * hours)
    // Heat is allowed all the way to nothing. The eroding gauges stop at the
    // floor, so a returning player always has enough left to act — and never
    // gets a gauge handed back up if it was already below it.
    out[key] = STATS[key].inverted
      ? drifted
      : Math.max(drifted, Math.min(out[key], OFFLINE_FLOOR))
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
    stats: data.stats,
    bankroll: data.bankroll,
    peakBankroll: data.peakBankroll,
    credits: data.credits,
    stash: data.stash,
    owned: data.owned,
    look: data.look,
    markets: data.markets,
    marketsAt: data.marketsAt,
    hedgeUntil: data.hedgeUntil,
    lastVisit: Date.now(),
    firstVisit: data.firstVisit,
    visits: data.visits,
    tally: data.tally,
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
  save.stats = applyDrift(save.stats, awayMs)
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
