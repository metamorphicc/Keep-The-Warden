import {
  ACTIONS,
  BET,
  DESK_READ,
  EDGE_SOFT_CAP,
  MARKET,
  MARKETS,
  MARKET_BY_ID,
  RIG_BY_ID,
  STATS,
  STAT_HIGH,
  STAT_LOW,
  STAT_ORDER,
  SUPPLY_BY_ID,
  TAP,
  WORLD,
  refusal,
  sanitizeName,
} from './config'
import { COPY } from './copy'
import { burst, emitFx, floatText, toast } from './fx'
import {
  clearSave,
  flushSave,
  pullCloudSave,
  releaseCloudWrites,
} from './persistence'
import { play } from './sound'
import {
  addStats,
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
  MarketState,
  ScreenId,
  Side,
  StatKey,
  Stats,
  TradeResult,
} from './types'
import { chance, formatCash, formatSigned, lerp, randFloat } from './util'
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

/**
 * Floats the stat deltas above him. Heat is inverted, so a negative Heat delta
 * counts as a win when deciding whether the whole label reads green or red.
 */
function showGains(gain: Partial<Stats>): void {
  const parts: string[] = []
  let net = 0
  for (const key of STAT_ORDER) {
    const v = gain[key]
    if (typeof v === 'number' && Math.abs(v) >= 1) {
      parts.push(`${v > 0 ? '+' : ''}${Math.round(v)} ${STATS[key].label}`)
      net += STATS[key].inverted ? -v : v
    }
  }
  if (parts.length) floatText(parts.join('  '), net >= 0 ? 'good' : 'bad')
}

/** Simulated cash moving. Positive is gold, negative is ember. */
function showCash(delta: number): void {
  if (Math.abs(delta) < 0.5) return
  floatText(formatSigned(delta), delta > 0 ? 'cash' : 'bad')
  if (delta > 0) {
    play('coin')
    burst('coin', { count: 8 })
  }
}

function showCredits(delta: number): void {
  if (delta <= 0) return
  floatText(`+${delta} ${WORLD.creditName}`, 'credit')
  play('shard')
  burst('spark', { count: 10, power: 1.3 })
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

/** Opens the ticket screen against one question. */
export function openBet(marketId: string | null): void {
  setState({ focusMarket: marketId, lastTrade: null })
  setScreen('bet')
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
   Refusal — one shape for every "no"
   ========================================================================== */

function refuse(message: string): ActionResult {
  startActivity('refuse', 620)
  say(message)
  play('deny')
  notify('warning')
  emitFx({ type: 'shake', power: 1 })
  return refusal(message)
}

/** Checks an action's stat window. Returns the refusal line, or null if fine. */
function blockedBy(actionId: string): string | null {
  const req = ACTIONS[actionId]?.requires
  if (!req) return null
  const value = getState().stats[req.stat]
  if (req.min !== undefined && value < req.min) return req.refuse
  if (req.max !== undefined && value > req.max) return req.refuse
  return null
}

/* ==========================================================================
   Tap him = check the PnL

   Free, endless, and deliberately weak. The window caps how often a thumb can
   demand another PnL check before he stops performing.
   ========================================================================== */

export function checkPnl(x?: number, y?: number): void {
  const s = getState()
  const now = Date.now()
  const window =
    now - s.tapWindow.since > TAP.windowMs ? { since: now, gained: 0 } : s.tapWindow

  if (window.gained >= TAP.windowCap) {
    startActivity('refuse', 520)
    say(COPY.pnlAnnoyed())
    play('deny')
    buzz('light')
    return
  }

  const gain: Partial<Stats> = { focus: TAP.focusPerTap }
  const gotCredit = chance(TAP.creditChance)

  setState({
    stats: addStats(gain),
    credits: s.credits + (gotCredit ? 1 : 0),
    activity: { kind: 'pnl', startedAt: now, duration: TAP.duration },
    tapWindow: { since: window.since, gained: window.gained + 1 },
    tally: { ...s.tally, taps: s.tally.taps + 1 },
  })

  burst('spark', { x, y, count: 7 })
  play(chance(0.35) ? 'grunt' : 'spark')
  buzz('light')
  if (gotCredit) showCredits(1)
  if (s.tally.taps % 4 === 0) say(COPY.pnl())
}

/* ==========================================================================
   Room actions

   `recover` and `hedge` resolve on the spot; `research`, `scan` and `bet` open
   their own screen, gated by the same stat window so a fried desk cannot walk
   into the ticket screen and size something up.
   ========================================================================== */

export function doAction(actionId: string): ActionResult {
  const def = ACTIONS[actionId]
  if (!def) return refusal('Nothing happens.')

  const blocked = blockedBy(actionId)
  if (blocked) return refuse(blocked)

  if (def.opens) {
    setScreen(def.opens)
    return { ok: true, message: '' }
  }

  if (!isReady(actionId)) {
    play('deny')
    say(COPY.cooldown())
    return refusal(COPY.cooldown())
  }

  const s = getState()
  const gain = def.gain ?? {}
  const cash = def.cash ?? 0
  const credits = def.credits ?? 0

  if (cash < 0 && s.bankroll + cash < 0) return refuse(COPY.broke())

  const tally = { ...s.tally }
  if (actionId === 'recover') tally.recovers += 1
  if (actionId === 'hedge') tally.hedges += 1

  setState({
    stats: addStats(gain),
    bankroll: Math.max(0, s.bankroll + cash),
    credits: s.credits + credits,
    tally,
    // a live hedge dampens the next fill in both directions
    hedgeUntil: actionId === 'hedge' ? Date.now() + BET.hedgeWindowMs : s.hedgeUntil,
  })

  startActivity(actionId as ActivityKind, def.duration ?? 1200)
  setCooldown(actionId, def.cooldown ?? 0)

  if (actionId === 'recover') {
    say(COPY.recover())
    play('snore')
    burst('zzz', { count: 4 })
    buzz('soft')
  } else if (actionId === 'hedge') {
    say(COPY.hedge())
    play('splash')
    burst('suds', { count: 16 })
    buzz('medium')
    toast('Hedge on', 'plain', 'Next fill is dampened both ways')
  }

  showGains(gain)
  showCash(cash)
  showCredits(credits)
  return { ok: true, message: '', gain, bankroll: cash, credits }
}

/* ==========================================================================
   Research — burn a note from the stash, or just sit and read for free
   ========================================================================== */

export function useSupply(supplyId: string): ActionResult {
  const supply = SUPPLY_BY_ID[supplyId]
  if (!supply) return refusal('There is nothing to read there.')

  const s = getState()
  const stock = s.stash[supplyId] ?? 0
  if (stock <= 0) {
    play('deny')
    return refusal('None left. The desk is bare.')
  }
  // notes only stop working when the edge is already as sharp as it gets
  const raisesEdge = (supply.gain.edge ?? 0) > 0
  if (raisesEdge && s.stats.edge >= EDGE_SOFT_CAP) {
    const msg = COPY.saturated()
    say(msg)
    play('deny')
    notify('warning')
    return refusal(msg)
  }

  const stash = { ...s.stash }
  stash[supplyId] = stock - 1
  if (stash[supplyId] <= 0) delete stash[supplyId]

  setState({
    stats: addStats(supply.gain),
    stash,
    tally: { ...s.tally, researches: s.tally.researches + 1 },
    cooldowns: supply.effect === 'clearCooldowns' ? {} : s.cooldowns,
  })

  startActivity('research', 1700)
  say(COPY.research())
  play('eat')
  burst('crumb', { count: 10 })
  buzz('medium')
  showGains(supply.gain)
  if (supply.effect === 'clearCooldowns') {
    toast('Head clears', 'good', 'Everything is usable again')
  }
  return { ok: true, message: '', gain: supply.gain }
}

/** The free read. No stash needed, long cooldown, small edge. */
export function deskRead(): ActionResult {
  const s = getState()
  if (!isReady('read')) {
    play('deny')
    say(COPY.cooldown())
    return refusal(COPY.cooldown())
  }
  if (s.stats.edge >= EDGE_SOFT_CAP) {
    const msg = COPY.saturated()
    say(msg)
    play('deny')
    return refusal(msg)
  }
  if (s.stats.focus < 10) return refuse(COPY.noFocus())

  setState({
    stats: addStats(DESK_READ.gain),
    tally: { ...s.tally, researches: s.tally.researches + 1 },
  })
  startActivity('research', DESK_READ.duration)
  setCooldown('read', DESK_READ.cooldown)
  say(COPY.research())
  play('eat')
  burst('crumb', { count: 6 })
  buzz('light')
  showGains(DESK_READ.gain)
  return { ok: true, message: '', gain: DESK_READ.gain }
}

/* ==========================================================================
   The board

   Six invented questions. Quotes are generated locally, wander a little on
   every scan, and are never fetched from anywhere. There is no feed.
   ========================================================================== */

/** The board as it stands, filling in un-scanned questions at their base. */
export function boardQuotes(): MarketState[] {
  const s = getState()
  const seen = new Map(s.markets.map((m) => [m.id, m]))
  return MARKETS.map(
    (def) => seen.get(def.id) ?? { id: def.id, prob: def.base, quotedAt: s.marketsAt },
  )
}

export function quoteFor(marketId: string): MarketState {
  const found = getState().markets.find((m) => m.id === marketId)
  if (found) return found
  const def = MARKET_BY_ID[marketId]
  return { id: marketId, prob: def?.base ?? 0.5, quotedAt: getState().marketsAt }
}

export function isStale(quotedAt: number, now = Date.now()): boolean {
  return now - quotedAt > MARKET.quoteTtlMs
}

/** Pulls each quote toward its question's centre, then lets it wander. */
function rollQuotes(now: number, only?: string): MarketState[] {
  const previous = new Map(getState().markets.map((m) => [m.id, m]))
  return MARKETS.map((def) => {
    const prior = previous.get(def.id)
    if (only && def.id !== only && prior) return prior
    const anchor = prior?.prob ?? def.base
    const pulled = lerp(anchor, def.base, 0.35)
    const wandered = pulled + randFloat(-def.drift, def.drift)
    return {
      id: def.id,
      prob: Math.min(MARKET.maxProb, Math.max(MARKET.minProb, Math.round(wandered * 100) / 100)),
      quotedAt: now,
    }
  })
}

export function doScan(): ActionResult {
  const s = getState()
  if (!isReady('scan')) {
    play('deny')
    return refusal(COPY.cooldown())
  }
  if (s.stats.focus < MARKET.focusCost) return refuse(COPY.noFocus())

  const now = Date.now()
  const gain: Partial<Stats> = { focus: -MARKET.focusCost, heat: MARKET.heatCost }

  setState({
    stats: addStats(gain),
    markets: rollQuotes(now),
    marketsAt: now,
    tally: { ...s.tally, scans: s.tally.scans + 1 },
  })

  startActivity('scan', 1200)
  setCooldown('scan', MARKET.cooldown)
  say(COPY.scan())
  play('dice')
  burst('spark', { count: 8 })
  buzz('medium')
  showGains(gain)
  return { ok: true, message: '', gain }
}

/* ==========================================================================
   Simulated fills

   Nothing here touches a real book. The quote is the price of one share, the
   coin is weighted by that quote plus his Edge, and the money is a number in a
   save file. That is the whole engine.
   ========================================================================== */

/** What a ticket would cost and pay, before the coin is thrown. */
export function previewFill(
  marketId: string,
  side: Side,
  stake: number,
  now = Date.now(),
): { price: number; slip: number; payout: number; profit: number; stale: boolean } {
  const s = getState()
  const quote = quoteFor(marketId)
  const stale = isStale(quote.quotedAt, now)
  const raw = side === 'yes' ? quote.prob : 1 - quote.prob

  const over = Math.max(0, s.stats.heat - BET.heatSlipAt)
  const heatSlip = (over / (100 - BET.heatSlipAt)) * BET.slipMax
  const slip = heatSlip + (stale ? MARKET.staleSlip : 0)
  const price = Math.min(0.97, Math.max(0.03, raw + slip))

  const payout = stake / price
  return { price, slip, payout, profit: payout - stake, stale }
}

/**
 * Puts a simulated ticket on. Charges the desk cost immediately, then resolves
 * after a short beat so the reveal has somewhere to land — `lastTrade` appears
 * on the store when the coin lands, not before.
 */
export function placeSimBet(marketId: string, side: Side, stake: number): ActionResult {
  const def = MARKET_BY_ID[marketId]
  if (!def) return refusal('That question is not on the board.')

  const s = getState()
  const now = Date.now()

  if (!isReady('fill')) return refusal('The last ticket has not printed yet.')
  if (stake > s.bankroll) return refuse(COPY.broke())
  if (s.stats.focus < def.focusCost) return refuse(COPY.noFocus())

  const { price, slip, stale } = previewFill(marketId, side, stake, now)
  const slipped = slip > 0.005

  // the coin: the quote, tilted toward his side by Edge. Edge does not buy
  // certainty, it buys a few points — which over enough tickets is the game.
  const tilt = (s.stats.edge / 100) * BET.edgeSwing
  const trueYes = Math.min(0.97, Math.max(0.03, quoteFor(marketId).prob + (side === 'yes' ? tilt : -tilt)))
  const trueProb = side === 'yes' ? trueYes : 1 - trueYes
  const won = Math.random() < trueProb

  const hedged = now < s.hedgeUntil
  const fee = Math.round(stake * BET.fee * 100) / 100
  let raw = won ? stake * (1 / price - 1) : -stake
  if (hedged) raw *= won ? BET.hedgeWinMult : BET.hedgeLossMult
  const pnl = Math.round((raw - fee) * 100) / 100

  const result: TradeResult = {
    marketId,
    question: def.question,
    side,
    stake,
    price,
    trueProb,
    won,
    pnl,
    fee,
    slipped,
    hedged,
  }

  // charged now: the focus and heat of actually sizing something up
  setState({
    stats: addStats({ focus: -def.focusCost, heat: def.heatCost }),
    lastTrade: null,
  })

  startActivity('bet', BET.resolveDelayMs)
  setCooldown('fill', BET.resolveDelayMs + 400)
  say(COPY.bet())
  play('sword')
  buzz('medium')
  if (stale) toast('Stale quote', 'bad', 'Filled worse than the board showed')
  else if (slipped) toast(COPY.slip(), 'bad')

  window.setTimeout(() => resolveFill(result), BET.resolveDelayMs)
  return { ok: true, message: '' }
}

function resolveFill(result: TradeResult): void {
  const s = getState()
  const gain = result.won ? BET.win : BET.loss
  const streak = result.won ? Math.max(0, s.tally.streak) + 1 : 0
  const bankroll = Math.max(0, Math.round((s.bankroll + result.pnl) * 100) / 100)

  setState({
    stats: addStats(gain),
    bankroll,
    hedgeUntil: 0,
    lastTrade: result,
    tally: {
      ...s.tally,
      bets: s.tally.bets + 1,
      wins: s.tally.wins + (result.won ? 1 : 0),
      losses: s.tally.losses + (result.won ? 0 : 1),
      streak,
      bestStreak: Math.max(s.tally.bestStreak, streak),
      bestWin: Math.max(s.tally.bestWin, Math.max(0, result.pnl)),
      worstLoss: Math.max(s.tally.worstLoss, Math.max(0, -result.pnl)),
    },
  })

  showCash(result.pnl)
  showGains(gain)

  const money = `${formatSigned(result.pnl)} · ${formatCash(bankroll)} left`
  if (result.won) {
    say(COPY.win())
    play('fanfare')
    notify('success')
    burst('coin', { count: 12, power: 1.2 })
    toast(COPY.win(), 'good', money)
  } else {
    say(COPY.loss())
    play('deny')
    notify('error')
    burst('ember', { count: 12, power: 1.2 })
    emitFx({ type: 'shake', power: 1.2 })
    toast(COPY.loss(), 'bad', money)
  }

  // the desk floats him again rather than ending the game. It costs Rep, which
  // is the only thing here he actually seems to mind losing.
  if (bankroll < BET.bailout.floor) {
    setState((st) => ({
      bankroll: Math.round((st.bankroll + BET.bailout.grant) * 100) / 100,
    }))
    setState({ stats: addStats({ rep: BET.bailout.rep }) })
    toast('The desk floats you', 'plain', `${formatCash(BET.bailout.grant)} against your name`)
    say('"Stake money. It is on the book, and so are you."')
  }
}

/* ==========================================================================
   Shop
   ========================================================================== */

function canAfford(price: number, currency: Currency): boolean {
  const s = getState()
  return currency === 'bankroll' ? s.bankroll >= price : s.credits >= price
}

function spend(price: number, currency: Currency): void {
  setState((s) =>
    currency === 'bankroll'
      ? { bankroll: Math.max(0, s.bankroll - price) }
      : { credits: Math.max(0, s.credits - price) },
  )
}

export function buySupply(supplyId: string, qty = 1): ActionResult {
  const supply = SUPPLY_BY_ID[supplyId]
  if (!supply) return refusal('Not for sale.')
  const cost = supply.price * qty
  if (!canAfford(cost, supply.currency)) {
    const msg = supply.currency === 'bankroll' ? COPY.broke() : COPY.noCredits()
    play('deny')
    notify('error')
    return refusal(msg)
  }
  spend(cost, supply.currency)
  setState((s) => ({
    stash: { ...s.stash, [supplyId]: (s.stash[supplyId] ?? 0) + qty },
  }))
  play('coin')
  buzz('medium')
  return { ok: true, message: COPY.buy() }
}

export function buyRig(id: string): ActionResult {
  const rig = RIG_BY_ID[id]
  if (!rig) return refusal('Not for sale.')
  const s = getState()
  if (s.owned.includes(id)) return refusal('Already yours.')
  if (!canAfford(rig.price, rig.currency)) {
    const msg = rig.currency === 'bankroll' ? COPY.broke() : COPY.noCredits()
    play('deny')
    notify('error')
    return refusal(msg)
  }
  spend(rig.price, rig.currency)
  setState((st) => ({ owned: [...st.owned, id] }))
  play('shard')
  notify('success')
  return { ok: true, message: COPY.buy() }
}

/* ==========================================================================
   The rig — cosmetics only
   ========================================================================== */

export function equipRig(id: string): ActionResult {
  const rig = RIG_BY_ID[id]
  if (!rig) return refusal('Nothing to put on.')
  if (!getState().owned.includes(id)) {
    play('deny')
    return refusal('Locked. Buy it first.')
  }
  setState((s) => ({ look: { ...s.look, [rig.slot]: id } }))
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
   Identity
   ========================================================================== */

/**
 * Renames him. Returns the name that was actually stored — the input is
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
      ? 'Back to the name on the badge, then.'
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
  say('The book is closed and the account is wiped. Nobody remembers you.')
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
   Derived: how he is holding up

   Ordered by what would kill the account first. Heat before everything, then
   the head, then the thesis, then whether anyone is still quoting him.
   ========================================================================== */

export type Demeanour = 'sharp' | 'hot' | 'fried' | 'blind' | 'ghosted'

export function demeanour(stats: Stats): Demeanour {
  if (stats.heat >= STAT_HIGH) return 'hot'
  if (stats.focus < STAT_LOW) return 'fried'
  if (stats.edge < STAT_LOW) return 'blind'
  return 'sharp'
}

export function statusLine(stats: Stats): string {
  switch (demeanour(stats)) {
    case 'hot':
      return COPY.hot()
    case 'fried':
      return COPY.noFocus()
    case 'blind':
      return COPY.noEdge()
    case 'ghosted':
      return COPY.noRep()
    default:
      return COPY.idle()
  }
}

/** Line for tapping a prop in the hall. */
export function propLine(prop: 'urn' | 'terminal' | 'bed' | 'torchL' | 'torchR' | 'door'): string {
  switch (prop) {
    case 'urn':
      return COPY.urn()
    case 'terminal':
      return COPY.terminal()
    case 'bed':
      return COPY.bed()
    case 'door':
      return COPY.door()
    default:
      return COPY.torch()
  }
}

/** Used by the HUD to decide when a gauge should start blinking. */
export function isAlarming(key: StatKey, value: number): boolean {
  if (key === 'rep') return false
  return STATS[key].inverted ? value >= STAT_HIGH : value < STAT_LOW
}
