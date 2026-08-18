import { useSyncExternalStore } from 'react'
import { NEEDS, NEED_ORDER } from './config'
import { loadSave, scheduleSave } from './persistence'
import type { GameState, Needs, SaveData } from './types'
import { clamp } from './util'

/* ==========================================================================
   A tiny observable store. No dependency, no boilerplate.
   State is immutable: every mutation replaces the object, so React's
   useSyncExternalStore can compare snapshots by identity.
   ========================================================================== */

function createInitialState(): GameState {
  const now = Date.now()
  const { save, awayMs } = loadSave(now)
  return {
    ...save,
    screen: 'boot',
    activity: { kind: 'idle', startedAt: now, duration: 0 },
    cooldowns: {},
    awayMs,
    line: '',
    lineId: 0,
    petWindow: { since: now, gained: 0 },
  }
}

let state: GameState = createInitialState()
const listeners = new Set<() => void>()

export function getState(): GameState {
  return state
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function saveSlice(): SaveData {
  return {
    version: state.version,
    needs: state.needs,
    coins: state.coins,
    shards: state.shards,
    larder: state.larder,
    owned: state.owned,
    look: state.look,
    lastVisit: state.lastVisit,
    firstVisit: state.firstVisit,
    visits: state.visits,
    stats: state.stats,
    settings: state.settings,
  }
}

export function setState(
  patch: Partial<GameState> | ((s: GameState) => Partial<GameState>),
): void {
  const next = typeof patch === 'function' ? patch(state) : patch
  state = { ...state, ...next }
  for (const l of listeners) l()
  scheduleSave(saveSlice)
}

/** Replaces the whole state (used by "reset save"). */
export function resetState(): void {
  state = { ...createInitialState(), screen: 'room' }
  for (const l of listeners) l()
  scheduleSave(saveSlice)
}

export function getSaveSlice(): SaveData {
  return saveSlice()
}

/* ==========================================================================
   React bindings
   ========================================================================== */

export function useGameState(): GameState {
  return useSyncExternalStore(subscribe, getState, getState)
}

/**
 * Selector hook. The whole state object is a stable snapshot between writes,
 * so the selector can safely build derived values without tearing.
 */
export function useGame<T>(selector: (s: GameState) => T): T {
  return selector(useSyncExternalStore(subscribe, getState, getState))
}

/* ==========================================================================
   Need helpers
   ========================================================================== */

export function addNeeds(delta: Partial<Needs>): Needs {
  const needs = { ...state.needs }
  for (const key of NEED_ORDER) {
    const d = delta[key]
    if (typeof d === 'number') needs[key] = clamp(needs[key] + d)
  }
  return needs
}

/** Average of all needs — drives the warden's overall demeanour. */
export function overallMood(needs: Needs): number {
  let sum = 0
  for (const key of NEED_ORDER) sum += needs[key]
  return sum / NEED_ORDER.length
}

/* ==========================================================================
   The clock
   ========================================================================== */

let lastTick = Date.now()

/**
 * Applies real-time decay. Safe to call at any cadence — decay is derived from
 * wall-clock delta, so a backgrounded WebView catches up on the next tick.
 * Decay is paused while he is asleep (that is the point of sleeping).
 */
export function tick(now = Date.now()): void {
  const dt = now - lastTick
  lastTick = now
  if (dt <= 0) return

  const asleep =
    state.activity.kind === 'sleep' &&
    now < state.activity.startedAt + state.activity.duration

  const hours = dt / 3_600_000
  const needs = { ...state.needs }
  let changed = false

  if (!asleep) {
    for (const key of NEED_ORDER) {
      const next = clamp(needs[key] - NEEDS[key].decayPerHour * hours)
      if (next !== needs[key]) {
        needs[key] = next
        changed = true
      }
    }
  }

  // expire the finished activity so the sprite returns to idle
  const activityDone =
    state.activity.kind !== 'idle' &&
    now >= state.activity.startedAt + state.activity.duration

  // reset the anti-spam petting window
  const petWindowDone = now - state.petWindow.since > 60_000

  if (!changed && !activityDone && !petWindowDone) {
    // still publish once a second so cooldown timers in the UI count down
    for (const l of listeners) l()
    return
  }

  setState({
    needs: changed ? needs : state.needs,
    activity: activityDone
      ? { kind: 'idle', startedAt: now, duration: 0 }
      : state.activity,
    petWindow: petWindowDone ? { since: now, gained: 0 } : state.petWindow,
  })
}

/** Call once when the app starts so the first tick has a sane baseline. */
export function resetClock(now = Date.now()): void {
  lastTick = now
}
