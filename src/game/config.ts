import type {
  ActionResult,
  MarketDef,
  RigDef,
  SaveData,
  StatKey,
  StatMeta,
  SupplyDef,
} from './types'
import { P } from '../styles/palette'
import type { IconName } from '../components/PixelIcon'

/* ==========================================================================
   World

   A paper-trading sim. No real money, no real book, no wallet. One room, one
   desk, one beginner trying to become a quant trader.
   ========================================================================== */

export const GAME_VERSION = '2.0.0'

/**
 * Save keys are namespaced per Telegram account, so two people sharing a
 * device (or the same browser) get their own trader. `SAVE_KEY_LEGACY` is the
 * flat key used before namespacing; it is adopted once, then left alone.
 */
export const SAVE_KEY_PREFIX = 'ktw.save.v1:'
export const SAVE_KEY_LEGACY = 'ktw.save.v1'
export const CLOUD_SAVE_KEY = 'ktw_save_v1'
export const SAVE_VERSION = 6

/** Longest name the player may give him. */
export const NAME_MAX = 18

/**
 * Names are player-typed, so they are also drawn into the HUD and stored in the
 * cloud. Keep letters (any alphabet), digits and the punctuation a name can
 * legitimately contain; drop everything else. An empty result falls back to the
 * default rather than leaving him nameless.
 */
export function sanitizeName(input: string): string {
  const cleaned = input
    .replace(/[^\p{L}\p{N} '\-.]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
    .trim()
  return cleaned.length > 0 ? cleaned : WORLD.hero
}

/** Original world naming. Prediction markets as a mood, not as a data feed. */
export const WORLD = {
  title: 'Quantum Pit',
  subtitle: 'Polymarket trader simulator',
  /** the main room */
  hall: 'The Desk',
  /** the settings screen */
  keep: 'The Back Office',
  hero: 'Max',
  cashName: 'Bankroll',
  creditName: 'Credits',
  /** printed anywhere the player might forget */
  disclaimer: 'Simulated only. No real money, no real orders.',
} as const

/* ==========================================================================
   Stats
   ========================================================================== */

export const STAT_ORDER: StatKey[] = ['edge', 'focus', 'heat', 'rep']

export const STATS: Record<StatKey, StatMeta> = {
  edge: {
    key: 'edge',
    label: 'Edge',
    icon: 'swordBlue',
    color: P.spiritLit,
    colorDark: P.spiritDeep,
    driftPerHour: 4,
    warn: 'No thesis. You are gambling, not trading.',
  },
  focus: {
    key: 'focus',
    label: 'Focus',
    icon: 'bolt',
    color: P.gold,
    colorDark: P.goldDark,
    driftPerHour: 6,
    warn: 'He is reading the same line four times. Let him sit down.',
  },
  heat: {
    key: 'heat',
    label: 'Heat',
    icon: 'flame',
    color: P.ember,
    colorDark: P.emberDeep,
    /** heat bleeds off slowly on its own — the gauge cools, it does not decay */
    driftPerHour: 5,
    inverted: true,
    warn: 'Heat is high. Hedge or blow the account.',
  },
  rep: {
    key: 'rep',
    label: 'Rep',
    icon: 'star',
    color: P.tealLit,
    colorDark: P.tealDeep,
    driftPerHour: 0,
    warn: 'His name is still nobody. Win cleanly before asking for respect.',
  },
}

/** Below this a normal gauge is "low" and its HUD bar starts blinking. */
export const STAT_LOW = 30
export const STAT_CRIT = 15
/** Above these, Heat is the problem. */
export const STAT_HIGH = 68
export const STAT_HOT = 85

/** The fifth HUD bar is derived: bankroll against its own high-water mark. */
export const BANKROLL_BAR = {
  label: 'Bankroll',
  icon: 'coin' as IconName,
  color: P.greenLit,
  colorDark: P.green,
}

/** Cap offline drift so a two-week absence is not an instant funeral. */
export const MAX_OFFLINE_HOURS = 36

/**
 * Offline drift never pushes an eroding gauge below this. Coming back after a
 * week should find a cold, dull desk — not a locked one; the floor sits a little
 * above the steepest action requirement (Sim Bet, focus 12) so the live clock
 * cannot immediately erode a returning player out of his own game. Heat is
 * exempt: cooling all the way down while away is the reward for leaving.
 */
export const OFFLINE_FLOOR = 18

/* ==========================================================================
   Actions
   ========================================================================== */

export interface ActionDef {
  id: string
  label: string
  icon: IconName
  /** navigates to a screen instead of resolving immediately */
  opens?: 'research' | 'scan' | 'bet' | 'rig' | 'shop' | 'settings'
  /** stat deltas on success */
  gain?: Partial<Record<StatKey, number>>
  /** simulated cash awarded (or charged, if negative) */
  cash?: number
  /** credits awarded */
  credits?: number
  /** ms before the button can be used again */
  cooldown?: number
  /** ms the character animation runs for */
  duration?: number
  /** refuses unless the stat sits inside the window */
  requires?: { stat: StatKey; min?: number; max?: number; refuse: string }
}

export const ACTIONS: Record<string, ActionDef> = {
  research: {
    id: 'research',
    label: 'Research',
    icon: 'stew',
    opens: 'research',
  },
  recover: {
    id: 'recover',
    label: 'Break',
    icon: 'bed',
    gain: { focus: 36, heat: -22, edge: -3 },
    cooldown: 40_000,
    duration: 2800,
  },
  hedge: {
    id: 'hedge',
    label: 'Hedge',
    icon: 'brush',
    gain: { heat: -26, focus: -4 },
    /** the hedge costs a little simulated cash to put on */
    cash: -2,
    cooldown: 26_000,
    duration: 1900,
    requires: {
      stat: 'focus',
      min: 8,
      refuse: 'Too fried to work the other leg. The hedge stays theoretical.',
    },
  },
  scan: {
    id: 'scan',
    label: 'Board',
    icon: 'dice',
    opens: 'scan',
    requires: {
      stat: 'focus',
      min: 6,
      refuse: 'The board is a smear of numbers. Nothing is being read today.',
    },
  },
  bet: {
    id: 'bet',
    label: 'Ticket',
    icon: 'terminal',
    opens: 'bet',
    requires: {
      stat: 'focus',
      min: 12,
      refuse: 'Sizing anything now would be a donation. His words.',
    },
  },
}

/** Order of the big action buttons at the desk. */
export const ACTION_BAR: string[] = ['research', 'hedge', 'recover', 'scan', 'bet']

/**
 * The free read, offered on the research screen when the stash is empty. Slow
 * and small on purpose — a broke desk still has a way back to an edge, it just
 * has to sit there and earn it.
 */
export const DESK_READ = {
  gain: { edge: 11, focus: -8 } as Partial<Record<StatKey, number>>,
  cooldown: 45_000,
  duration: 1700,
}

/** Past this, more reading does nothing and he says so. */
export const EDGE_SOFT_CAP = 92

/* ==========================================================================
   Tapping him = Check PnL
   ========================================================================== */

export const TAP = {
  focusPerTap: 0.3,
  /** soft cap: max PnL checking per window */
  windowMs: 60_000,
  windowCap: 12,
  /** chance a check shakes a credit loose (a rebate, a referral, who knows) */
  creditChance: 0.06,
  duration: 620,
}

/* ==========================================================================
   The board — mock questions only. Nothing is fetched, ever.
   ========================================================================== */

export const MARKETS: MarketDef[] = [
  {
    id: 'btc120',
    question: 'Will BTC close above 120k this month?',
    tag: 'BTC',
    icon: 'coin',
    base: 0.42,
    drift: 0.14,
    focusCost: 4,
    heatCost: 3,
    blurb: 'Round number, round crowd. The book leans long and knows it.',
  },
  {
    id: 'ethbtc',
    question: 'Will ETH outperform BTC this week?',
    tag: 'ETH',
    icon: 'shard',
    base: 0.47,
    drift: 0.1,
    focusCost: 3,
    heatCost: 2,
    blurb: 'A coin flip with a newsletter attached.',
  },
  {
    id: 'fedhike',
    question: 'Fed hike before October?',
    tag: 'MACRO',
    icon: 'gear',
    base: 0.23,
    drift: 0.09,
    focusCost: 5,
    heatCost: 4,
    blurb: 'Everyone has read the same dot plot and drawn a different line.',
  },
  {
    id: 'soletf',
    question: 'Solana ETF approved this year?',
    tag: 'ETF',
    icon: 'star',
    base: 0.31,
    drift: 0.13,
    focusCost: 5,
    heatCost: 4,
    blurb: 'Priced on hope and one anonymous filing screenshot.',
  },
  {
    id: 'gasunder',
    question: 'Gas under 5 gwei for a full day?',
    tag: 'CHAIN',
    icon: 'bolt',
    base: 0.56,
    drift: 0.16,
    focusCost: 3,
    heatCost: 2,
    blurb: 'Quiet chains are cheap chains. Chains are rarely quiet.',
  },
  {
    id: 'rugweek',
    question: 'Another top-50 token down 40% this week?',
    tag: 'RISK',
    icon: 'skull',
    base: 0.61,
    drift: 0.12,
    focusCost: 4,
    heatCost: 5,
    blurb: 'The house always has a favourite in this one.',
  },
]

export const MARKET_BY_ID: Record<string, MarketDef> = Object.fromEntries(
  MARKETS.map((m) => [m.id, m]),
)

export const MARKET = {
  /** a scan re-quotes the whole board */
  focusCost: 7,
  heatCost: 2,
  cooldown: 9_000,
  /** after this, quotes are stale and fills get worse */
  quoteTtlMs: 10 * 60_000,
  /** extra slippage taken when filling against a stale quote */
  staleSlip: 0.04,
  /** quotes never sit at the extremes — nothing is ever certain here */
  minProb: 0.06,
  maxProb: 0.94,
}

/* ==========================================================================
   Simulated fills

   Polymarket-style: the quote IS the price of one YES share, so a stake of
   $25 at 40c buys 62.5 shares that pay $1 each if it resolves your way.
   ========================================================================== */

export const BET = {
  sizes: [10, 25, 50],
  /** taken off the stake on every fill */
  fee: 0.02,
  /** how far full Edge tilts the real coin toward your side, in probability */
  edgeSwing: 0.08,
  /** above this Heat, fills start slipping against you */
  heatSlipAt: 60,
  /** worst-case slippage at Heat 100 */
  slipMax: 0.06,
  /** how long the "resolving" beat lasts */
  resolveDelayMs: 1700,
  win: { rep: 5, heat: 7, focus: -4, edge: -2 },
  loss: { rep: -3, heat: 12, focus: -10, edge: -2 },
  /** the hedge dampens the next fill in both directions */
  hedgeWindowMs: 100_000,
  hedgeWinMult: 0.7,
  hedgeLossMult: 0.55,
  /** the desk floats him again rather than ending the game */
  bailout: { floor: 10, grant: 25, rep: -8 },
}

/* ==========================================================================
   Career progression
   ========================================================================== */

export const LEVEL_MAX = 30
export const XP = {
  win: 100,
  loss: 20,
}

export const CAREER_MILESTONES = [
  { min: 1, title: 'Beginner' },
  { min: 6, title: 'Amateur' },
  { min: 11, title: 'Research Intern' },
  { min: 16, title: 'Junior Quant' },
  { min: 21, title: 'Desk Trader' },
  { min: 26, title: 'Quant Trader' },
] as const

export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  if (level > LEVEL_MAX) return xpForLevel(LEVEL_MAX)
  return Math.floor(70 * Math.pow(level - 1, 1.45))
}

export function levelFromXp(xp: number): number {
  const safeXp = Math.max(0, Math.floor(xp))
  for (let level = LEVEL_MAX; level >= 1; level--) {
    if (safeXp >= xpForLevel(level)) return level
  }
  return 1
}

export function careerStatusForLevel(level: number): string {
  const safeLevel = Math.max(1, Math.min(LEVEL_MAX, Math.floor(level)))
  let status: string = CAREER_MILESTONES[0].title
  for (const milestone of CAREER_MILESTONES) {
    if (safeLevel >= milestone.min) status = milestone.title
  }
  return status
}

export function xpProgress(xp: number): { level: number; current: number; needed: number; pct: number } {
  const level = levelFromXp(xp)
  const floor = xpForLevel(level)
  const next = level >= LEVEL_MAX ? floor : xpForLevel(level + 1)
  const span = Math.max(1, next - floor)
  const current = level >= LEVEL_MAX ? span : Math.max(0, Math.floor(xp) - floor)
  const needed = level >= LEVEL_MAX ? span : span
  return {
    level,
    current,
    needed,
    pct: level >= LEVEL_MAX ? 100 : Math.min(100, Math.round((current / needed) * 100)),
  }
}

/* ==========================================================================
   Notes and signals — the "research" stash. Consumed one at a time.
   ========================================================================== */

export const SUPPLIES: SupplyDef[] = [
  {
    id: 'orderflow',
    name: 'Order Flow Notes',
    icon: 'stew',
    price: 14,
    currency: 'bankroll',
    gain: { edge: 30, focus: -6 },
    desc: 'Someone else did the reading. Their handwriting is terrible.',
  },
  {
    id: 'primer',
    name: 'Base Rate Primer',
    icon: 'bread',
    price: 7,
    currency: 'bankroll',
    gain: { edge: 16 },
    desc: 'Dull, correct, and quietly worth more than any thread.',
  },
  {
    id: 'depthmap',
    name: 'Depth Map',
    icon: 'fish',
    price: 20,
    currency: 'bankroll',
    gain: { edge: 26, heat: -6, focus: -4 },
    desc: 'Where the size is hiding. Mostly it is hiding from you.',
  },
  {
    id: 'thread',
    name: 'Anon Thread',
    icon: 'mushroom',
    price: 4,
    currency: 'bankroll',
    gain: { edge: 12, heat: 9, focus: -3 },
    desc: 'Two lines are genuine alpha. Forty are not. Good luck.',
  },
  {
    id: 'dossier',
    name: 'Resolution Dossier',
    icon: 'meat',
    price: 34,
    currency: 'bankroll',
    gain: { edge: 44, focus: -10 },
    desc: 'The actual rules of the actual question. Almost nobody reads them.',
  },
  {
    id: 'coffee',
    name: 'Burnt Coffee',
    icon: 'ale',
    price: 6,
    currency: 'bankroll',
    gain: { focus: 24, heat: 6 },
    desc: 'Warm, flat, beloved. Do not drink it before sizing up.',
  },
  {
    id: 'coldbrew',
    name: 'Cold Brew Flask',
    icon: 'honey',
    price: 16,
    currency: 'bankroll',
    gain: { focus: 40, edge: 4, heat: 8 },
    desc: 'Three days of clarity, borrowed at a punitive rate.',
  },
  {
    id: 'clarity',
    name: 'Clarity Draught',
    icon: 'potion',
    price: 2,
    currency: 'credits',
    gain: { focus: 46, heat: -30 },
    effect: 'clearCooldowns',
    desc: 'Tastes like a cold hallway. Everything is usable again.',
  },
]

export const SUPPLY_BY_ID: Record<string, SupplyDef> = Object.fromEntries(
  SUPPLIES.map((s) => [s.id, s]),
)

/* ==========================================================================
   The rig — cosmetics. Same three slots the sprite has always had.
   ========================================================================== */

export const RIGS: RigDef[] = [
  // ---- headset ----
  {
    id: 'head_none',
    name: 'Messy Hair',
    slot: 'head',
    icon: 'mask',
    price: 0,
    currency: 'bankroll',
    desc: 'Eighteen, under-slept, and not yet pretending otherwise.',
    starter: true,
  },
  {
    id: 'head_circlet',
    name: 'Quant Visor',
    slot: 'head',
    icon: 'helm',
    price: 40,
    currency: 'bankroll',
    desc: 'Keeps the glare down and the doubts out.',
  },
  {
    id: 'head_antler',
    name: 'Antenna Rig',
    slot: 'head',
    icon: 'antler',
    price: 85,
    currency: 'bankroll',
    desc: 'Picks up nothing. He swears it front-runs the news.',
  },
  {
    id: 'head_crown',
    name: 'Whale Crown',
    slot: 'head',
    icon: 'crown',
    price: 6,
    currency: 'credits',
    desc: 'Worn by someone who exited at the top. Once.',
  },
  // ---- coat ----
  {
    id: 'cloak_rag',
    name: 'Home Hoodie',
    slot: 'cloak',
    icon: 'cloak',
    price: 0,
    currency: 'bankroll',
    desc: 'Soft, ordinary, and absolutely not professional. Starter uniform.',
    starter: true,
  },
  {
    id: 'cloak_watch',
    name: 'Nightdesk Coat',
    slot: 'cloak',
    icon: 'cloak',
    price: 55,
    currency: 'bankroll',
    desc: 'Teal wool, thick as guilt. Standard issue, long discontinued.',
  },
  {
    id: 'cloak_pelt',
    name: 'Drawdown Pelt',
    slot: 'cloak',
    icon: 'pelt',
    price: 95,
    currency: 'bankroll',
    desc: 'Whatever wore it first also got liquidated.',
  },
  {
    id: 'cloak_ember',
    name: 'Liquidation Drape',
    slot: 'cloak',
    icon: 'cloak',
    price: 5,
    currency: 'credits',
    desc: 'Smoulders faintly. He calls that a feature.',
  },
  // ---- desk tools ----
  {
    id: 'blade_steel',
    name: 'Old Keyboard',
    slot: 'blade',
    icon: 'sword',
    price: 0,
    currency: 'bankroll',
    desc: 'Sticky keys, taped cable, still better than guessing.',
    starter: true,
  },
  {
    id: 'blade_spirit',
    name: 'Chart Pad',
    slot: 'blade',
    icon: 'swordBlue',
    price: 70,
    currency: 'bankroll',
    desc: 'A small screen for sketches, signals, and bad ideas made visible.',
  },
  {
    id: 'blade_ember',
    name: 'Risk Tablet',
    slot: 'blade',
    icon: 'swordRed',
    price: 4,
    currency: 'credits',
    desc: 'Warm to touch. Warmer after the third martingale.',
  },
]

export const RIG_BY_ID: Record<string, RigDef> = Object.fromEntries(RIGS.map((r) => [r.id, r]))

export const SLOT_LABEL: Record<'head' | 'cloak' | 'blade', string> = {
  head: 'Headset',
  cloak: 'Coat',
  blade: 'Tools',
}

/* ==========================================================================
   Fresh save
   ========================================================================== */

export const START_BANKROLL = 300

export function freshSave(now: number): SaveData {
  return {
    version: SAVE_VERSION,
    name: WORLD.hero,
    stats: { edge: 40, focus: 62, heat: 18, rep: 8 },
    bankroll: START_BANKROLL,
    xp: 0,
    peakBankroll: START_BANKROLL,
    credits: 2,
    stash: { primer: 2, coffee: 1 },
    owned: RIGS.filter((r) => r.starter).map((r) => r.id),
    look: { head: 'head_none', cloak: 'cloak_rag', blade: 'blade_steel' },
    markets: [],
    marketsAt: 0,
    hedgeUntil: 0,
    lastVisit: now,
    firstVisit: now,
    visits: 1,
    tally: {
      taps: 0,
      researches: 0,
      recovers: 0,
      hedges: 0,
      scans: 0,
      bets: 0,
      wins: 0,
      losses: 0,
      streak: 0,
      bestStreak: 0,
      bestWin: 0,
      worstLoss: 0,
    },
    settings: { sound: true, haptics: true, reduceMotion: false },
  }
}

/** Convenience for the refuse paths, so callers never build this by hand. */
export function refusal(message: string): ActionResult {
  return { ok: false, message }
}
