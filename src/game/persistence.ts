import {
  MAX_OFFLINE_HOURS,
  NEEDS,
  NEED_ORDER,
  SAVE_KEY,
  SAVE_VERSION,
  freshSave,
} from './config'
import type { Needs, SaveData } from './types'
import { clamp } from './util'

export interface LoadResult {
  save: SaveData
  /** ms since the previous session (0 for a brand new save) */
  awayMs: number
  fresh: boolean
}

/**
 * Reads the save, repairs anything missing/corrupt, then applies the decay the
 * warden suffered while the app was closed. Offline decay is capped so a long
 * absence is survivable.
 */
export function loadSave(now: number): LoadResult {
  const base = freshSave(now)

  let raw: string | null = null
  try {
    raw = localStorage.getItem(SAVE_KEY)
  } catch {
    // private mode / storage disabled — play in-memory
    return { save: base, awayMs: 0, fresh: true }
  }
  if (!raw) return { save: base, awayMs: 0, fresh: true }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { save: base, awayMs: 0, fresh: true }
  }
  if (!parsed || typeof parsed !== 'object') {
    return { save: base, awayMs: 0, fresh: true }
  }

  const save = migrate(parsed as Partial<SaveData>, base)
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
  writeSave(data)
}

export function writeSave(data: SaveData): void {
  try {
    const payload: SaveData = {
      version: SAVE_VERSION,
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
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload))
  } catch {
    // out of quota or storage blocked — nothing we can do, keep playing
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(SAVE_KEY)
  } catch {
    /* ignore */
  }
}
