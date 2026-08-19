import type { IconName } from '../components/PixelIcon'

/* ==========================================================================
   Needs
   ========================================================================== */

export type NeedKey = 'hunger' | 'energy' | 'mood' | 'clean' | 'spirit'

export type Needs = Record<NeedKey, number>

export interface NeedMeta {
  key: NeedKey
  label: string
  icon: IconName
  /** bar fill colour (hex) */
  color: string
  /** darker shade used for the bar's bottom row */
  colorDark: string
  /** points lost per real hour */
  decayPerHour: number
  /** line shown when this need is critically low */
  warn: string
}

/* ==========================================================================
   Screens / navigation
   ========================================================================== */

export type ScreenId =
  | 'boot'
  | 'room'
  | 'feed'
  | 'wardrobe'
  | 'train'
  | 'shop'
  | 'profile'
  | 'settings'

/* ==========================================================================
   Character activity (drives the sprite animation)
   ========================================================================== */

export type ActivityKind =
  | 'idle'
  | 'pet'
  | 'eat'
  | 'sleep'
  | 'wash'
  | 'play'
  | 'train'
  | 'refuse'

export interface Activity {
  kind: ActivityKind
  startedAt: number
  duration: number
}

/* ==========================================================================
   Items
   ========================================================================== */

export type Currency = 'coins' | 'shards'

export interface FoodDef {
  id: string
  name: string
  icon: IconName
  price: number
  currency: Currency
  /** need deltas applied on eat */
  gain: Partial<Needs>
  /** dry one-liner shown in the detail panel */
  desc: string
}

export type EquipSlot = 'head' | 'cloak' | 'blade'

export interface CosmeticDef {
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
   Persisted save
   ========================================================================== */

export interface SaveData {
  version: number
  /** what the player calls him — renameable, defaults to WORLD.hero */
  name: string
  needs: Needs
  coins: number
  shards: number
  /** foodId -> count in the larder */
  larder: Record<string, number>
  /** cosmeticIds the player owns */
  owned: string[]
  look: EquippedLook
  /** epoch ms of the last time the game was open */
  lastVisit: number
  /** epoch ms of first boot, used for the day counter */
  firstVisit: number
  /** number of separate sessions */
  visits: number
  /** cumulative counters, for flavour text */
  stats: {
    pets: number
    meals: number
    naps: number
    washes: number
    plays: number
    trains: number
    bestCombo: number
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
  /** the warden's current line, shown in the speech ribbon */
  line: string
  /** bumped whenever a new line is set so the bubble can re-animate */
  lineId: number
  /** mood gained from tapping in the current window (soft cap) */
  petWindow: { since: number; gained: number }
}

export interface ActionResult {
  ok: boolean
  message: string
  gain?: Partial<Needs>
  coins?: number
  shards?: number
}
