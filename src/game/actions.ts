import {
  ACTIONS,
  COSMETIC_BY_ID,
  FOOD_BY_ID,
  NEEDS,
  NEED_ORDER,
  PET,
  TRAIN,
  WORLD,
  sanitizeName,
} from './config'
import { COPY } from './copy'
import { burst, emitFx, floatText } from './fx'
import {
  clearSave,
  flushSave,
  pullCloudSave,
  releaseCloudWrites,
} from './persistence'
import { play } from './sound'
import {
  addNeeds,
  adoptSave,
  getSaveSlice,
  getState,
  resetState,
  setState,
} from './store'
import type {
  ActionResult,
  ActivityKind,
  Currency,
  EquipSlot,
  Needs,
  ScreenId,
} from './types'
import { chance, clamp } from './util'
import {
  haptic,
  hapticNotify,
  hapticSelect,
  setBackButton,
  type HapticStyle,
} from '../telegram/telegram'

/* ==========================================================================
   Feedback helpers (respect the player's settings)
   ========================================================================== */

function buzz(kind: HapticStyle = 'light'): void {
  if (getState().settings.haptics) haptic(kind)
}

function notify(kind: 'success' | 'error' | 'warning'): void {
  if (getState().settings.haptics) hapticNotify(kind)
}

export function say(line: string): void {
  setState((s) => ({ line, lineId: s.lineId + 1 }))
}

function startActivity(kind: ActivityKind, duration: number): void {
  setState({ activity: { kind, startedAt: Date.now(), duration } })
}

/** Show the need deltas as floating text above the character. */
function showGains(gain: Partial<Needs>): void {
  const parts: string[] = []
  for (const key of NEED_ORDER) {
    const v = gain[key]
    if (typeof v === 'number' && Math.abs(v) >= 1) {
      parts.push(`${v > 0 ? '+' : ''}${Math.round(v)} ${NEEDS[key].label}`)
    }
  }
  if (parts.length) floatText(parts.join('  '), 'good')
}

function reward(coins: number, shards: number): void {
  if (coins > 0) {
    floatText(`+${coins} ${WORLD.coinName}`, 'coin')
    play('coin')
    burst('coin', { count: 8 })
  }
  if (shards > 0) {
    floatText(`+${shards} ${WORLD.shardName}`, 'shard')
    play('shard')
    burst('spark', { count: 10, power: 1.3 })
  }
}

/* ==========================================================================
   Navigation
   ========================================================================== */

export function setScreen(screen: ScreenId): void {
  if (getState().screen === screen) return
  play(screen === 'room' ? 'back' : 'click')
  if (getState().settings.haptics) hapticSelect()
  setState({ screen })
  // Telegram's native back button mirrors the in-app one
  setBackButton(screen === 'room' || screen === 'boot' ? null : () => setScreen('room'))
}

export function enterHall(): void {
  const s = getState()
  const line =
    s.awayMs > 3 * 3_600_000
      ? COPY.greetLong()
      : s.awayMs > 0
        ? COPY.greetShort()
        : COPY.idle()
  setState({ screen: 'room', line, lineId: s.lineId + 1 })
  play('fanfare')
  setBackButton(null)
}

/* ==========================================================================
   Cooldowns
   ========================================================================== */

export function cooldownLeft(actionId: string, now = Date.now()): number {
  return Math.max(0, (getState().cooldowns[actionId] ?? 0) - now)
}

export function isReady(actionId: string, now = Date.now()): boolean {
  return cooldownLeft(actionId, now) <= 0
}

function setCooldown(actionId: string, ms: number): void {
  if (ms <= 0) return
  setState((s) => ({ cooldowns: { ...s.cooldowns, [actionId]: Date.now() + ms } }))
}

/* ==========================================================================
   Tap the character
   ========================================================================== */

export function petWarden(x?: number, y?: number): void {
  const s = getState()
  const now = Date.now()
  const window = now - s.petWindow.since > PET.windowMs
    ? { since: now, gained: 0 }
    : s.petWindow

  if (window.gained >= PET.windowCap) {
    startActivity('refuse', 520)
    say(COPY.petAnnoyed())
    play('deny')
    buzz('light')
    return
  }

  const moodGain = PET.moodPerTap
  const spiritGain = PET.spiritPerTap
  const needs = addNeeds({ mood: moodGain, spirit: spiritGain })
  const gotCoin = chance(PET.coinChance)

  setState({
    needs,
    coins: s.coins + (gotCoin ? 1 : 0),
    activity: { kind: 'pet', startedAt: now, duration: PET.duration },
    petWindow: { since: window.since, gained: window.gained + moodGain },
    stats: { ...s.stats, pets: s.stats.pets + 1 },
  })

  burst('spark', { x, y, count: 7 })
  play(chance(0.35) ? 'grunt' : 'spark')
  buzz('light')
  if (gotCoin) reward(1, 0)
  if (s.stats.pets % 4 === 0) say(COPY.pet())
}

/* ==========================================================================
   Room actions: sleep / wash / play  (feed + train open their own screens)
   ========================================================================== */

export function doAction(actionId: string): ActionResult {
  const def = ACTIONS[actionId]
  if (!def) return { ok: false, message: 'Nothing happens.' }

  if (def.opens) {
    // gate the screen too, so Train cannot be entered on an empty tank
    if (def.requires && getState().needs[def.requires.need] < def.requires.min) {
      return refuse(def.requires.refuse)
    }
    setScreen(def.opens)
    return { ok: true, message: '' }
  }

  if (!isReady(actionId)) {
    play('deny')
    say(COPY.cooldown())
    return { ok: false, message: COPY.cooldown() }
  }

  if (def.requires && getState().needs[def.requires.need] < def.requires.min) {
    return refuse(def.requires.refuse)
  }

  const s = getState()
  const gain = def.gain ?? {}
  const needs = addNeeds(gain)
  const coins = def.coins ?? 0
  const shards = def.shards ?? 0

  const statPatch = { ...s.stats }
  if (actionId === 'sleep') statPatch.naps += 1
  if (actionId === 'wash') statPatch.washes += 1
  if (actionId === 'play') statPatch.plays += 1

  setState({
    needs,
    coins: s.coins + coins,
    shards: s.shards + shards,
    stats: statPatch,
  })

  startActivity(actionId as ActivityKind, def.duration ?? 1200)
  setCooldown(actionId, def.cooldown ?? 0)

  // per-action flavour
  if (actionId === 'sleep') {
    say(COPY.sleep())
    play('snore')
    burst('zzz', { count: 4 })
    buzz('soft')
  } else if (actionId === 'wash') {
    say(COPY.wash())
    play('splash')
    burst('suds', { count: 16 })
    buzz('medium')
  } else if (actionId === 'play') {
    say(COPY.play())
    play('dice')
    burst('spark', { count: 8 })
    buzz('medium')
  }

  showGains(gain)
  reward(coins, shards)
  return { ok: true, message: '', gain, coins, shards }
}

function refuse(message: string): ActionResult {
  startActivity('refuse', 620)
  say(message)
  play('deny')
  notify('warning')
  emitFx({ type: 'shake', power: 1 })
  return { ok: false, message }
}

/* ==========================================================================
   Feeding
   ========================================================================== */

export function feedFromLarder(foodId: string): ActionResult {
  const food = FOOD_BY_ID[foodId]
  if (!food) return { ok: false, message: 'That is not food.' }

  const s = getState()
  const stock = s.larder[foodId] ?? 0
  if (stock <= 0) {
    play('deny')
    return { ok: false, message: 'None left. The larder echoes.' }
  }
  if (s.needs.hunger >= 98) {
    const msg = COPY.full()
    say(msg)
    play('deny')
    notify('warning')
    return { ok: false, message: msg }
  }

  const larder = { ...s.larder }
  larder[foodId] = stock - 1
  if (larder[foodId] <= 0) delete larder[foodId]

  setState({
    needs: addNeeds(food.gain),
    larder,
    stats: { ...s.stats, meals: s.stats.meals + 1 },
  })

  startActivity('eat', 1700)
  say(COPY.eat())
  play('eat')
  burst('crumb', { count: 10 })
  buzz('medium')
  showGains(food.gain)
  return { ok: true, message: '', gain: food.gain }
}

/* ==========================================================================
   Shop
   ========================================================================== */

function canAfford(price: number, currency: Currency): boolean {
  const s = getState()
  return currency === 'coins' ? s.coins >= price : s.shards >= price
}

function spend(price: number, currency: Currency): void {
  setState((s) =>
    currency === 'coins'
      ? { coins: Math.max(0, s.coins - price) }
      : { shards: Math.max(0, s.shards - price) },
  )
}

export function buyFood(foodId: string, qty = 1): ActionResult {
  const food = FOOD_BY_ID[foodId]
  if (!food) return { ok: false, message: 'Not for sale.' }
  const cost = food.price * qty
  if (!canAfford(cost, food.currency)) {
    const msg = food.currency === 'coins' ? COPY.broke() : COPY.noShards()
    play('deny')
    notify('error')
    return { ok: false, message: msg }
  }
  spend(cost, food.currency)
  setState((s) => ({
    larder: { ...s.larder, [foodId]: (s.larder[foodId] ?? 0) + qty },
  }))
  play('coin')
  buzz('medium')
  return { ok: true, message: COPY.buy() }
}

export function buyCosmetic(id: string): ActionResult {
  const item = COSMETIC_BY_ID[id]
  if (!item) return { ok: false, message: 'Not for sale.' }
  const s = getState()
  if (s.owned.includes(id)) return { ok: false, message: 'Already yours.' }
  if (!canAfford(item.price, item.currency)) {
    const msg = item.currency === 'coins' ? COPY.broke() : COPY.noShards()
    play('deny')
    notify('error')
    return { ok: false, message: msg }
  }
  spend(item.price, item.currency)
  setState((st) => ({ owned: [...st.owned, id] }))
  play('shard')
  notify('success')
  return { ok: true, message: COPY.buy() }
}

/* ==========================================================================
   Wardrobe
   ========================================================================== */

export function equipCosmetic(id: string): ActionResult {
  const item = COSMETIC_BY_ID[id]
  if (!item) return { ok: false, message: 'Nothing to wear.' }
  if (!getState().owned.includes(id)) {
    play('deny')
    return { ok: false, message: 'Locked. Buy it first.' }
  }
  setState((s) => ({ look: { ...s.look, [item.slot]: id } }))
  play('click')
  buzz('light')
  burst('spark', { count: 6 })
  say(COPY.equip())
  return { ok: true, message: '' }
}

export function unequipSlot(slot: EquipSlot): ActionResult {
  setState((s) => ({ look: { ...s.look, [slot]: null } }))
  play('back')
  return { ok: true, message: '' }
}

/* ==========================================================================
   Training mini-game
   ========================================================================== */

/** Charges the energy cost and returns false if he simply cannot. */
export function beginTraining(): boolean {
  const s = getState()
  if (s.needs.energy < TRAIN.energyCost) {
    refuse('Not enough left in the legs. Rest first.')
    return false
  }
  setState({ needs: addNeeds({ energy: -TRAIN.energyCost }) })
  return true
}

export function registerHit(combo: number): void {
  play('hit')
  burst('straw', { count: 4 + Math.min(6, combo) })
  if (getState().settings.haptics) haptic(combo > 4 ? 'heavy' : 'light')
}

export function finishTraining(hits: number, bestCombo: number): ActionResult {
  const s = getState()
  const coins = Math.round(hits * TRAIN.coinsPerHit + bestCombo * 0.6)
  const shards = Math.floor(hits / TRAIN.hitsPerShard)
  const scale = clamp(hits / 25, 0.25, 1.4)
  const gain: Partial<Needs> = {}
  for (const [k, v] of Object.entries(TRAIN.gain) as [keyof Needs, number][]) {
    gain[k] = Math.round(v * scale)
  }

  setState({
    needs: addNeeds(gain),
    coins: s.coins + coins,
    shards: s.shards + shards,
    stats: {
      ...s.stats,
      trains: s.stats.trains + 1,
      bestCombo: Math.max(s.stats.bestCombo, bestCombo),
    },
  })

  say(hits >= 20 ? COPY.trainGood() : COPY.trainBad())
  if (hits >= 20) play('fanfare')
  notify(hits >= 20 ? 'success' : 'warning')
  return { ok: true, message: '', gain, coins, shards }
}

/* ==========================================================================
   Identity
   ========================================================================== */

/**
 * Renames the warden. Returns the name that was actually stored — the input is
 * sanitised, so it may come back trimmed, stripped or replaced by the default.
 */
export function renameWarden(input: string): string {
  const name = sanitizeName(input)
  const previous = getState().name
  setState({ name })
  play(name === previous ? 'click' : 'fanfare')
  buzz('medium')
  if (name === previous) return name
  say(
    name === WORLD.hero
      ? 'Back to the name on the roster, then.'
      : `He tries it out under his breath. "${name}." It will do.`,
  )
  return name
}

/* ==========================================================================
   Settings
   ========================================================================== */

export function toggleSetting(key: 'sound' | 'haptics' | 'reduceMotion'): void {
  setState((s) => ({ settings: { ...s.settings, [key]: !s.settings[key] } }))
  play('click')
  buzz('light')
}

export function resetGame(): void {
  clearSave()
  resetState()
  play('back')
  say('The hall is swept. Nobody remembers you.')
}

export function saveNow(): void {
  flushSave(getSaveSlice())
}

/**
 * Boot-time sync: if this Telegram account has newer progress stored against it
 * (another device, or a reinstall), adopt it. Runs once, and only takes effect
 * while the player is still on the title screen — a late answer must never yank
 * the state out from under someone who is already playing.
 */
export async function syncFromCloud(): Promise<void> {
  try {
    const result = await pullCloudSave(Date.now())
    if (result && getState().screen === 'boot') {
      adoptSave(result.save, result.awayMs)
    }
  } catch {
    /* offline, unsupported client, malformed payload — local save stands */
  } finally {
    releaseCloudWrites()
  }
}

/* ==========================================================================
   Derived: what the warden looks/feels like right now
   ========================================================================== */

export type Demeanour = 'content' | 'hungry' | 'tired' | 'filthy' | 'sad' | 'hollow'

export function demeanour(needs: Needs): Demeanour {
  const worst = NEED_ORDER.reduce((acc, k) => (needs[k] < needs[acc] ? k : acc), NEED_ORDER[0]!)
  if (needs[worst] >= 45) return 'content'
  switch (worst) {
    case 'hunger':
      return 'hungry'
    case 'energy':
      return 'tired'
    case 'clean':
      return 'filthy'
    case 'mood':
      return 'sad'
    case 'spirit':
      return 'hollow'
  }
}

export function statusLine(needs: Needs): string {
  switch (demeanour(needs)) {
    case 'hungry':
      return NEEDS.hunger.warn
    case 'tired':
      return COPY.tired()
    case 'filthy':
      return COPY.dirty()
    case 'sad':
      return COPY.sad()
    case 'hollow':
      return COPY.lowSpirit()
    default:
      return COPY.idle()
  }
}
