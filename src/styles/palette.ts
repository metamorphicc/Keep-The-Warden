/**
 * Single source of truth for the palette.
 *
 * The canvas renderers import these values directly; `tokens.css` mirrors the
 * same hex codes as CSS custom properties for the DOM/UI layer. If you change a
 * colour here, change it there too.
 *
 * Mood: cozy-dark dungeon interior. Deep browns, gold, ember orange, muted
 * teal, bone-white text. No pastels, no glossy highlights.
 */
export const P = {
  // --- darks / outlines -----------------------------------------------------
  ink: '#0c0806',
  ink2: '#150d09',
  shadow: '#1b110b',

  // --- wood ----------------------------------------------------------------
  woodDeep: '#241610',
  woodDark: '#33200f',
  wood: '#4a2f1e',
  woodLit: '#6b4429',
  woodHi: '#8a5a35',

  // --- stone ---------------------------------------------------------------
  stoneDeep: '#1e1a17',
  stoneDark: '#2b2622',
  stone: '#453d36',
  stoneLit: '#5d5349',
  stoneHi: '#7a6e60',

  // --- gold ----------------------------------------------------------------
  goldDark: '#8a6018',
  gold: '#d9a132',
  goldLit: '#f2cf6a',

  // --- ember / fire --------------------------------------------------------
  emberDeep: '#8c3211',
  ember: '#e2622a',
  emberLit: '#ff9b3d',
  emberPale: '#ffd18a',

  // --- teal ----------------------------------------------------------------
  tealDeep: '#16332f',
  teal: '#3f8a80',
  tealLit: '#6fbdae',

  // --- spirit (blue energy) ------------------------------------------------
  spiritDeep: '#1c4a63',
  spirit: '#4aa8d8',
  spiritLit: '#6fd3e8',
  spiritPale: '#c8f4ff',

  // --- bone / text ---------------------------------------------------------
  bone: '#e8dfc8',
  boneDim: '#b9ae94',
  boneDeep: '#7d7461',
  white: '#fffaf0',

  // --- blood / banners -----------------------------------------------------
  bloodDeep: '#4a1714',
  blood: '#7d2b24',
  bloodLit: '#a9382c',

  // --- armour plate --------------------------------------------------------
  plateDeep: '#171a22',
  plateDark: '#242833',
  plate: '#343a4a',
  plateLit: '#4d5568',

  // --- flesh ---------------------------------------------------------------
  skinShade: '#a06b46',
  skin: '#c98d5e',
  skinLit: '#e0ab7c',

  // --- misc ----------------------------------------------------------------
  strawDark: '#8a6524',
  straw: '#b98b3f',
  strawLit: '#d8b45e',
  green: '#4f7a34',
  greenLit: '#79a851',
} as const

export type PaletteKey = keyof typeof P
