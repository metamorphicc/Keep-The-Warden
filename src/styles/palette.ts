/**
 * Single source of truth for the palette.
 *
 * The canvas renderers import these values directly; `tokens.css` mirrors the
 * same hex codes as CSS custom properties for the DOM/UI layer. If you change a
 * colour here, change it there too.
 *
 * Mood: late-night trader apartment. Charcoal walls, walnut desk, paper-note
 * amber, hot-risk red, monitor teal/cyan, warm off-white text.
 */
export const P = {
  // --- darks / outlines -----------------------------------------------------
  ink: '#070a0f',
  ink2: '#0d1118',
  shadow: '#141823',

  // --- wood ----------------------------------------------------------------
  woodDeep: '#1c1511',
  woodDark: '#2c2119',
  wood: '#4d392b',
  woodLit: '#72523a',
  woodHi: '#9a704a',

  // --- stone ---------------------------------------------------------------
  stoneDeep: '#111820',
  stoneDark: '#1b2530',
  stone: '#2b3743',
  stoneLit: '#43515f',
  stoneHi: '#687887',

  // --- gold ----------------------------------------------------------------
  goldDark: '#8a671f',
  gold: '#d8ac3f',
  goldLit: '#ffe087',

  // --- ember / fire --------------------------------------------------------
  emberDeep: '#7d211d',
  ember: '#d84a3a',
  emberLit: '#ff7d56',
  emberPale: '#ffb38a',

  // --- teal ----------------------------------------------------------------
  tealDeep: '#102f35',
  teal: '#2f8b91',
  tealLit: '#62c7c8',

  // --- spirit (blue energy) ------------------------------------------------
  spiritDeep: '#15365e',
  spirit: '#367ec9',
  spiritLit: '#68c9ff',
  spiritPale: '#c7f2ff',

  // --- bone / text ---------------------------------------------------------
  bone: '#e8dfc8',
  boneDim: '#b9ae94',
  boneDeep: '#7d7461',
  white: '#fffaf0',

  // --- blood / banners -----------------------------------------------------
  bloodDeep: '#4a1e27',
  blood: '#803142',
  bloodLit: '#b34c62',

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
