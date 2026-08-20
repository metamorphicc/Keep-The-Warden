import type { IconName } from '../components/PixelIcon'

/* ==========================================================================
   Trader stats

   Four 0..100 gauges. Bankroll is deliberately NOT one of them — it is real
   (simulated) money, unbounded, and it only moves on fills, fees and events.
   The HUD still shows five bars: the fifth is bankroll health, derived from
   the drawdown off the peak.
   ========================================================================== */

export type StatKey = 'edge' | 'focus' | 'heat' | 'rep'

export type Stats = Record<StatKey, number>

export interface StatMeta {
  key: StatKey
  label: string
  icon: IconName
  /** bar fill colour (hex) */
  color: string
  /** darker shade used for the bar's bottom row */
  colorDark: string
  /**
   * Points lost per real hour. Negative means the gauge drifts *up* while the
   * app is closed — nothing does that yet, but Heat is the obvious candidate
   * if the tuning ever wants a slow burn instead of a slow cool.
   */
  driftPerHour: number
  /** true when a HIGH value is the dangerous one (Heat) */
  inverted?: boolean
  /** line shown when this stat goes critical */
  warn: string
}

/* ==========================================================================
   Screens / navigation
   ========================================================================== */

export type ScreenId =
  | 'boot'
  /** the trading hall — the one main screen */
  | 'room'
  | 'research'
  | 'scan'
  | 'bet'
  | 'rig'
  | 'shop'
  | 'profile'
  | 'settings'

/* ==========================================================================
   Character activity (drives the sprite animation)
   ========================================================================== */

export type ActivityKind =
  | 'idle'
  /** tapped: he shows you the book */
  | 'pnl'
  | 'research'
  | 'recover'
  | 'hedge'
  | 'scan'
  | 'bet'
  | 'refuse'

export interface Activity {
  kind: ActivityKind
  startedAt: number
  duration: number
}

/* ==========================================================================
   Money

   `bankroll` is the simulated cash line. `credits` are the slower currency —
   earned from good books, spent on the things bankroll should not buy.
   ========================================================================== */

export type Currency = 'bankroll' | 'credits'

/* ==========================================================================
   Items
   ========================================================================== */

/** One-shot desk supplies: coffee, notes, a cooldown draught. */
export interface SupplyDef {
  id: string
  name: string
  icon: IconName
  price: number
  currency: Currency
  /** stat deltas applied on use */
  gain: Partial<Stats>
  /** side effect beyond the stat deltas */
  effect?: 'clearCooldowns' | 'freeScan'
  /** dry one-liner shown in the detail panel */
  desc: string
}

export type EquipSlot = 'head' | 'cloak' | 'blade'

export interface RigDef {
  id: string
  name: string
  slot: EquipSlot
  icon: IconName
  price: number
  currency: Currency
  desc: string
  /** owned from the start */
  starter?: boolean
}

export type EquippedLook = Record<EquipSlot, string | null>

/* ==========================================================================
   Markets — mock only. No feed, no API, no real book.
   ========================================================================== */

export type Side = 'yes' | 'no'

/** The static question. Quotes are generated, never fetched. */
export interface MarketDef {
  id: string
  question: string
  /** short chip label */
  tag: string
  icon: IconName
  /** centre of the quoted YES probability, 0..1 */
  base: number
  /** how far the quote wanders each scan, in probability points */
  drift: number
  focusCost: number
  heatCost: number
  blurb: string
}

/** A quote on the board right now. Persisted, so the book survives a reload. */
export interface MarketState {
  id: string
  /** quoted YES probability, 0..1 */
  prob: number
  /** epoch ms the quote was taken */
  quotedAt: number
}

/** What a resolved simulated position did. Feeds the toast and the tally. */
export interface TradeResult {
  marketId: string
  question: string
  side: Side
  stake: number
  /** effective fill price after any heat slippage, 0..1 */
  price: number
  /** true probability the coin was weighted with, after Edge */
  trueProb: number
  won: boolean
  /** bankroll delta, already net of the fee */
  pnl: number
  fee: number
  slipped: boolean
  hedged: boolean
  xpGained: number
}

/* ==========================================================================
   Persisted save
   ========================================================================== */

export interface SaveData {
  version: number
  /** what the player calls him — renameable, defaults to WORLD.hero */
  name: string
  stats: Stats
  /** simulated cash. Not real money. Never was. */
  bankroll: number
  /** career progression, earned from settled simulated trades */
  xp: number
  /** high-water mark, so the HUD can show a drawdown */
  peakBankroll: number
  credits: number
  /** supplyId -> count on the desk */
  stash: Record<string, number>
  /** rigIds the player owns */
  owned: string[]
  look: EquippedLook
  /** the board as last scanned */
  markets: MarketState[]
  /** epoch ms of the last scan */
  marketsAt: number
  /** epoch ms until which the hedge dampens the next fill */
  hedgeUntil: number
  /** epoch ms of the last time the game was open */
  lastVisit: number
  /** epoch ms of first boot, used for the day counter */
  firstVisit: number
  /** number of separate sessions */
  visits: number
  /** cumulative counters, for flavour text */
  tally: {
    taps: number
    researches: number
    recovers: number
    hedges: number
    scans: number
    bets: number
    wins: number
    losses: number
    streak: number
    bestStreak: number
    /** best single simulated win */
    bestWin: number
    /** worst single simulated loss (positive number) */
    worstLoss: number
  }
  settings: {
    sound: boolean
    haptics: boolean
    reduceMotion: boolean
  }
}

/* ==========================================================================
   Runtime state = save + ephemeral UI state
   ========================================================================== */

export interface GameState extends SaveData {
  screen: ScreenId
  activity: Activity
  /** actionId -> epoch ms when it becomes usable again */
  cooldowns: Record<string, number>
  /** ms the player was away on this boot (0 if fresh save) */
  awayMs: number
  /** his current line, shown in the speech ribbon */
  line: string
  /** bumped whenever a new line is set so the bubble can re-animate */
  lineId: number
  /** which market the bet screen is working on */
  focusMarket: string | null
  /** the last resolved position, for the bet screen's result panel */
  lastTrade: TradeResult | null
  /** PnL checks in the current anti-spam window */
  tapWindow: { since: number; gained: number }
}

export interface ActionResult {
  ok: boolean
  message: string
  gain?: Partial<Stats>
  bankroll?: number
  credits?: number
}
