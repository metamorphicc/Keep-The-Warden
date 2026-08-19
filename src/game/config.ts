import type {
  CosmeticDef,
  FoodDef,
  NeedKey,
  NeedMeta,
  SaveData,
} from './types'
import { P } from '../styles/palette'
import type { IconName } from '../components/PixelIcon'

/* ==========================================================================
   World
   ========================================================================== */

export const GAME_VERSION = '1.0.0'

/**
 * Save keys are namespaced per Telegram account, so two people sharing a
 * device (or the same browser) get their own warden. `SAVE_KEY_LEGACY` is the
 * flat key used before namespacing; it is adopted once, then left alone.
 */
export const SAVE_KEY_PREFIX = 'ktw.save.v1:'
export const SAVE_KEY_LEGACY = 'ktw.save.v1'
export const CLOUD_SAVE_KEY = 'ktw_save_v1'
export const SAVE_VERSION = 4

/** Longest name the player may give the warden. */
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

/** Original world naming — no real-world or third-party references. */
export const WORLD = {
  title: 'Keep The Warden',
  hall: 'The Deep Hall',
  keep: 'Emberhold',
  hero: 'Warden Halvard',
  coinName: 'Marks',
  shardName: 'Shards',
} as const

/* ==========================================================================
   Needs
   ========================================================================== */

export const NEED_ORDER: NeedKey[] = ['hunger', 'energy', 'mood', 'clean', 'spirit']

export const NEEDS: Record<NeedKey, NeedMeta> = {
  hunger: {
    key: 'hunger',
    label: 'Hunger',
    icon: 'stew',
    color: P.ember,
    colorDark: P.emberDeep,
    decayPerHour: 7,
    warn: 'The Warden is hungry. Stew or regret.',
  },
  energy: {
    key: 'energy',
    label: 'Energy',
    icon: 'bolt',
    color: P.gold,
    colorDark: P.goldDark,
    decayPerHour: 5,
    warn: 'His knees have filed a complaint. Let him sleep.',
  },
  mood: {
    key: 'mood',
    label: 'Mood',
    icon: 'mask',
    color: P.bloodLit,
    colorDark: P.bloodDeep,
    decayPerHour: 8,
    warn: 'He is sulking at the door again. Do something.',
  },
  clean: {
    key: 'clean',
    label: 'Clean',
    icon: 'brush',
    color: P.tealLit,
    colorDark: P.tealDeep,
    decayPerHour: 4.5,
    warn: 'The armour smells like a battle nobody won.',
  },
  spirit: {
    key: 'spirit',
    label: 'Spirit',
    icon: 'flame',
    color: P.spiritLit,
    colorDark: P.spiritDeep,
    decayPerHour: 3.5,
    warn: 'The blue light is thinning. That is never good.',
  },
}

/** Below this a need is "critical" and the HUD bar starts blinking. */
export const NEED_LOW = 30
export const NEED_CRIT = 15

/** Cap offline decay so a two-week absence is not an instant funeral. */
export const MAX_OFFLINE_HOURS = 36

/* ==========================================================================
   Actions
   ========================================================================== */

export interface ActionDef {
  id: string
  label: string
  icon: IconName
  /** navigates to a screen instead of resolving immediately */
  opens?: 'feed' | 'train' | 'wardrobe' | 'shop' | 'settings'
  /** need deltas on success */
  gain?: Partial<Record<NeedKey, number>>
  /** coins awarded */
  coins?: number
  /** shards awarded */
  shards?: number
  /** ms before the button can be used again */
  cooldown?: number
  /** ms the character animation runs for */
  duration?: number
  /** refuses if this need is below the threshold */
  requires?: { need: NeedKey; min: number; refuse: string }
}

export const ACTIONS: Record<string, ActionDef> = {
  feed: {
    id: 'feed',
    label: 'Feed',
    icon: 'stew',
    opens: 'feed',
  },
  sleep: {
    id: 'sleep',
    label: 'Sleep',
    icon: 'bed',
    gain: { energy: 34, hunger: -6, mood: 3 },
    cooldown: 40_000,
    duration: 2800,
  },
  wash: {
    id: 'wash',
    label: 'Wash',
    icon: 'brush',
    gain: { clean: 42, energy: -5, mood: -2 },
    coins: 0,
    cooldown: 26_000,
    duration: 1900,
    requires: {
      need: 'energy',
      min: 8,
      refuse: 'Too tired to scrub. Even the rust is winning.',
    },
  },
  play: {
    id: 'play',
    label: 'Play',
    icon: 'dice',
    gain: { mood: 26, energy: -9, hunger: -4, spirit: 4 },
    coins: 3,
    cooldown: 16_000,
    duration: 1800,
    requires: {
      need: 'energy',
      min: 12,
      refuse: 'He looks at the dice. The dice look back. Nothing happens.',
    },
  },
  train: {
    id: 'train',
    label: 'Train',
    icon: 'dummy',
    opens: 'train',
    requires: {
      need: 'energy',
      min: 15,
      refuse: 'The dummy can wait. His spine cannot.',
    },
  },
}

/** Order of the big action buttons in the main room. */
export const ACTION_BAR: string[] = ['feed', 'wash', 'sleep', 'play', 'train']

/* ==========================================================================
   Petting (tap the character)
   ========================================================================== */

export const PET = {
  /** mood per tap */
  moodPerTap: 1.6,
  spiritPerTap: 0.5,
  /** soft cap: max mood gain per window */
  windowMs: 60_000,
  windowCap: 14,
  /** chance a tap shakes a coin loose */
  coinChance: 0.07,
  duration: 620,
}

/* ==========================================================================
   Larder — original food names
   ========================================================================== */

export const FOODS: FoodDef[] = [
  {
    id: 'stew',
    name: 'Ashroot Stew',
    icon: 'stew',
    price: 6,
    currency: 'coins',
    gain: { hunger: 34, mood: 6, energy: 4 },
    desc: 'Thick, grey, and honest. Nobody asks what the roots were.',
  },
  {
    id: 'hardtack',
    name: 'Hardtack Loaf',
    icon: 'bread',
    price: 3,
    currency: 'coins',
    gain: { hunger: 18 },
    desc: 'Older than the door it was baked behind. Still counts as food.',
  },
  {
    id: 'trout',
    name: 'Bog Trout',
    icon: 'fish',
    price: 9,
    currency: 'coins',
    gain: { hunger: 30, spirit: 6, clean: -4 },
    desc: 'Caught in water that glows. He insists that is a good sign.',
  },
  {
    id: 'cavecap',
    name: 'Cavecap Caps',
    icon: 'mushroom',
    price: 5,
    currency: 'coins',
    gain: { hunger: 16, spirit: 10, mood: -3 },
    desc: 'Two are supper. Three are a conversation with the wall.',
  },
  {
    id: 'boarleg',
    name: 'Salted Boar Leg',
    icon: 'meat',
    price: 14,
    currency: 'coins',
    gain: { hunger: 52, mood: 10, energy: 8, clean: -6 },
    desc: 'A feast. He will be insufferable about it for hours.',
  },
  {
    id: 'ale',
    name: 'Hollow Ale',
    icon: 'ale',
    price: 7,
    currency: 'coins',
    gain: { mood: 24, hunger: 8, energy: -6 },
    desc: 'Warm, flat, beloved. Do not serve it before a watch.',
  },
  {
    id: 'honey',
    name: 'Emberdrop Honey',
    icon: 'honey',
    price: 11,
    currency: 'coins',
    gain: { hunger: 20, energy: 22, mood: 8 },
    desc: 'The bees were angry and slightly on fire. Worth it.',
  },
  {
    id: 'broth',
    name: 'Spirit Broth',
    icon: 'potion',
    price: 2,
    currency: 'shards',
    gain: { spirit: 40, hunger: 12, mood: 4 },
    desc: 'Tastes like a cold hallway. Fills the blue back up.',
  },
]

export const FOOD_BY_ID: Record<string, FoodDef> = Object.fromEntries(
  FOODS.map((f) => [f.id, f]),
)

/* ==========================================================================
   Regalia — cosmetics, original names
   ========================================================================== */

export const COSMETICS: CosmeticDef[] = [
  // ---- head ----
  {
    id: 'head_none',
    name: 'Bare Head',
    slot: 'head',
    icon: 'mask',
    price: 0,
    currency: 'coins',
    desc: 'Just the beard and the scars. Classic.',
    starter: true,
  },
  {
    id: 'head_circlet',
    name: 'Ironbrow Circlet',
    slot: 'head',
    icon: 'helm',
    price: 40,
    currency: 'coins',
    desc: 'Keeps the hair down and the doubts out.',
  },
  {
    id: 'head_antler',
    name: 'Antler Helm',
    slot: 'head',
    icon: 'antler',
    price: 85,
    currency: 'coins',
    desc: 'The stag lost. The hat won.',
  },
  {
    id: 'head_crown',
    name: 'Hollow Crown',
    slot: 'head',
    icon: 'crown',
    price: 6,
    currency: 'shards',
    desc: 'Belonged to a king. He does not say which one.',
  },
  // ---- cloak ----
  {
    id: 'cloak_rag',
    name: 'Tattered Mantle',
    slot: 'cloak',
    icon: 'cloak',
    price: 0,
    currency: 'coins',
    desc: 'Forty winters of holes, arranged with dignity.',
    starter: true,
  },
  {
    id: 'cloak_watch',
    name: 'Deepwatch Cloak',
    slot: 'cloak',
    icon: 'cloak',
    price: 55,
    currency: 'coins',
    desc: 'Teal wool, thick as guilt. Standard issue, long discontinued.',
  },
  {
    id: 'cloak_pelt',
    name: 'Ashen Pelt',
    slot: 'cloak',
    icon: 'pelt',
    price: 95,
    currency: 'coins',
    desc: 'Whatever wore it first was bigger than him.',
  },
  {
    id: 'cloak_ember',
    name: 'Emberweave Drape',
    slot: 'cloak',
    icon: 'cloak',
    price: 5,
    currency: 'shards',
    desc: 'Smoulders faintly. He calls that a feature.',
  },
  // ---- blade ----
  {
    id: 'blade_steel',
    name: 'Old Steel',
    slot: 'blade',
    icon: 'sword',
    price: 0,
    currency: 'coins',
    desc: 'Two plain swords. They have never asked for anything.',
    starter: true,
  },
  {
    id: 'blade_spirit',
    name: 'Spirit-Bound Edge',
    slot: 'blade',
    icon: 'swordBlue',
    price: 70,
    currency: 'coins',
    desc: 'Hums in the dark. Louder when he lies.',
  },
  {
    id: 'blade_ember',
    name: 'Emberfang Pair',
    slot: 'blade',
    icon: 'swordRed',
    price: 4,
    currency: 'shards',
    desc: 'Warm to hold. Warmer to be hit by.',
  },
]

export const COSMETIC_BY_ID: Record<string, CosmeticDef> = Object.fromEntries(
  COSMETICS.map((c) => [c.id, c]),
)

export const SLOT_LABEL: Record<'head' | 'cloak' | 'blade', string> = {
  head: 'Head',
  cloak: 'Cloak',
  blade: 'Blades',
}

/* ==========================================================================
   Training mini-game
   ========================================================================== */

export const TRAIN = {
  durationMs: 15_000,
  energyCost: 14,
  /** coins per hit, before combo */
  coinsPerHit: 0.34,
  /** hits needed per shard */
  hitsPerShard: 18,
  /** combo grows while taps land within this window */
  comboWindowMs: 900,
  maxCombo: 8,
  gain: { mood: 14, spirit: 12, hunger: -8, clean: -10 },
}

/* ==========================================================================
   Fresh save
   ========================================================================== */

export function freshSave(now: number): SaveData {
  return {
    version: SAVE_VERSION,
    name: WORLD.hero,
    needs: { hunger: 62, energy: 58, mood: 55, clean: 48, spirit: 70 },
    coins: 26,
    shards: 2,
    larder: { stew: 2, hardtack: 3 },
    owned: COSMETICS.filter((c) => c.starter).map((c) => c.id),
    look: { head: 'head_none', cloak: 'cloak_rag', blade: 'blade_steel' },
    lastVisit: now,
    firstVisit: now,
    visits: 1,
    stats: {
      pets: 0,
      meals: 0,
      naps: 0,
      washes: 0,
      plays: 0,
      trains: 0,
      bestCombo: 0,
    },
    settings: { sound: true, haptics: true, reduceMotion: false },
  }
}
