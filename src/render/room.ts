import { P } from '../styles/palette'
import { dither, drawMatrix, lightPool, noise2, outline, px, pxa, pxLine, type Ctx } from './draw'

/* ==========================================================================
   The Deep Hall — a single low-resolution room, drawn procedurally.
   Static geometry is rendered once into an offscreen canvas and blitted every
   frame; only fire, light flicker and props animate.
   ========================================================================== */

/* --------------------------------------------------------------------------
   Geometry.

   The hall itself is authored in a 192x208 "room space". The canvas is taller
   than that: a dark rafter void sits above the ceiling beam and a strip of
   foreground floor sits below, so the scene fills a tall phone stage without
   ever being scaled by a fraction. Room-space drawing happens inside a
   translate(0, VOID_H); everything the outside world touches (SCENE, HOTSPOTS)
   is already in canvas space.
   -------------------------------------------------------------------------- */

const R = { w: 192, h: 208, floorY: 152 } as const
/** unlit rafter space above the ceiling beam */
const VOID_H = 56
/** floor in front of the hall, closest to the viewer */
const FORE_H = 24

export const SCENE = {
  w: R.w,
  h: VOID_H + R.h + FORE_H,
  /** top of the stone floor */
  floorY: VOID_H + R.floorY,
  /** the warden's feet */
  heroX: 96,
  heroY: VOID_H + 182,
} as const

/** Tappable props in the room, in scene coordinates. */
export const HOTSPOTS = {
  hero: { x: 74, y: VOID_H + 118, w: 44, h: 66 },
  cauldron: { x: 144, y: VOID_H + 142, w: 42, h: 38 },
  bed: { x: 4, y: VOID_H + 152, w: 48, h: 28 },
  torchL: { x: 18, y: VOID_H + 68, w: 20, h: 30 },
  torchR: { x: 154, y: VOID_H + 68, w: 20, h: 30 },
  door: { x: 68, y: VOID_H + 46, w: 56, h: 92 },
} as const


export type HotspotName = keyof typeof HOTSPOTS

export function hitTest(x: number, y: number): HotspotName | null {
  // hero first: he stands in front of everything
  const order: HotspotName[] = ['hero', 'cauldron', 'bed', 'torchL', 'torchR', 'door']
  for (const name of order) {
    const h = HOTSPOTS[name]
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return name
  }
  return null
}

/* --------------------------------------------------------------------------
   Fire
   -------------------------------------------------------------------------- */

const FIRE_CHARS: Record<string, string> = {
  a: P.emberDeep,
  b: P.ember,
  c: P.emberLit,
  d: P.emberPale,
}

const FLAME_FRAMES: readonly string[][] = [
  [
    '...d...',
    '..dcd..',
    '..ccd..',
    '.bcccb.',
    '.bcccb.',
    'abcccba',
    'abbbbba',
    '.abbba.',
    '..aaa..',
  ],
  [
    '..d....',
    '..dcd..',
    '.dccd..',
    '.bccdb.',
    'abcccb.',
    'abccbba',
    'abbbbba',
    '.aabba.',
    '..aaa..',
  ],
  [
    '....d..',
    '..dcd..',
    '..dccd.',
    '.bdccb.',
    '.bcccba',
    'abbcccb',
    'abbbbba',
    '.abaaa.',
    '..aaa..',
  ],
]

function flame(ctx: Ctx, x: number, y: number, t: number, seed: number): void {
  const idx = Math.floor(t / 110 + seed * 3) % FLAME_FRAMES.length
  drawMatrix(ctx, FLAME_FRAMES[idx]!, x, y, FIRE_CHARS, seed > 0.5)
}

/* --------------------------------------------------------------------------
   Static geometry
   -------------------------------------------------------------------------- */

function drawCeiling(ctx: Ctx): void {
  px(ctx, 0, 0, R.w, 16, '#100a07')
  // main beam
  px(ctx, 0, 10, R.w, 8, P.woodDeep)
  px(ctx, 0, 10, R.w, 2, P.woodDark)
  px(ctx, 0, 16, R.w, 2, P.ink)
  for (let x = 6; x < R.w; x += 24) {
    px(ctx, x, 12, 2, 2, P.goldDark)
    px(ctx, x + 1, 12, 1, 1, P.gold)
  }
}

function drawWall(ctx: Ctx): void {
  const top = 18
  const bottom = 138
  px(ctx, 0, top, R.w, bottom - top, P.woodDark)

  // vertical boards
  for (let i = 0; i * 16 < R.w; i++) {
    const x = i * 16
    const shade = noise2(i, 3)
    const base = shade > 0.62 ? '#3d2517' : shade > 0.3 ? P.woodDark : '#2e1c0e'
    px(ctx, x, top, 16, bottom - top, base)
    // seam + edge highlight
    px(ctx, x, top, 1, bottom - top, '#1c1109')
    px(ctx, x + 1, top, 1, bottom - top, '#4a2f1e')
    px(ctx, x + 15, top, 1, bottom - top, '#150d07')
    // grain
    for (let y = top + 3; y < bottom; y += 7) {
      const n = noise2(i * 7 + y, y)
      if (n > 0.55) px(ctx, x + 3 + Math.floor(n * 9), y, 2, 1, '#241509')
      else if (n < 0.16) px(ctx, x + 4 + Math.floor(n * 20), y + 2, 3, 1, '#40281a')
    }
  }

  // cross rail
  px(ctx, 0, 96, R.w, 8, P.wood)
  px(ctx, 0, 96, R.w, 2, P.woodLit)
  px(ctx, 0, 102, R.w, 2, '#1c1109')
  for (let x = 4; x < R.w; x += 16) {
    px(ctx, x, 98, 2, 2, P.stoneHi)
    px(ctx, x, 98, 1, 1, '#9c9082')
  }

  // top gloom
  for (let y = top; y < top + 30; y++) {
    pxa(ctx, 0, y, R.w, 1, '#000000', 0.5 * (1 - (y - top) / 30))
  }
}

function drawSkirting(ctx: Ctx): void {
  const y = 138
  px(ctx, 0, y, R.w, 14, P.stoneDark)
  px(ctx, 0, y, R.w, 2, P.ink)
  // blocks
  for (let i = 0; i * 24 < R.w; i++) {
    const x = i * 24
    const n = noise2(i, 11)
    px(ctx, x + 1, y + 3, 22, 9, n > 0.5 ? P.stone : '#3d362f')
    px(ctx, x + 1, y + 3, 22, 1, P.stoneLit)
    px(ctx, x, y + 3, 1, 9, P.stoneDeep)
    if (n > 0.75) px(ctx, x + 6, y + 7, 4, 1, P.stoneDeep)
  }
  px(ctx, 0, y + 12, R.w, 2, P.ink)
}

function drawArchAndDoor(ctx: Ctx): void {
  const dx = 68
  const dw = 56
  const dTop = 46
  const dBottom = 138

  // --- stone arch surround ---
  outline(ctx, dx - 8, dTop - 8, dw + 16, dBottom - dTop + 8, P.ink, 1)
  for (let i = 0; i < 4; i++) {
    // side pillars
    for (let y = dTop - 8; y < dBottom; y += 12) {
      const n = noise2(i * 3, y)
      const c = n > 0.5 ? P.stone : P.stoneDark
      px(ctx, dx - 8, y, 8, 11, c)
      px(ctx, dx + dw, y, 8, 11, c)
      px(ctx, dx - 8, y, 8, 1, P.stoneLit)
      px(ctx, dx + dw, y, 8, 1, P.stoneLit)
      px(ctx, dx - 8, y + 11, 8, 1, P.stoneDeep)
      px(ctx, dx + dw, y + 11, 8, 1, P.stoneDeep)
    }
  }
  // lintel keystones
  for (let i = 0; i < 6; i++) {
    const x = dx - 8 + i * 12
    px(ctx, x, dTop - 8, 11, 8, i === 2 || i === 3 ? P.stoneLit : P.stone)
    px(ctx, x, dTop - 8, 11, 1, P.stoneHi)
    px(ctx, x + 11, dTop - 8, 1, 8, P.stoneDeep)
  }
  // keystone sigil
  px(ctx, dx + dw / 2 - 3, dTop - 6, 6, 4, P.goldDark)
  px(ctx, dx + dw / 2 - 2, dTop - 5, 4, 2, P.gold)

  // --- door recess ---
  px(ctx, dx, dTop, dw, dBottom - dTop, '#0d0805')

  // --- two carved leaves ---
  for (let leaf = 0; leaf < 2; leaf++) {
    const lx = dx + 2 + leaf * 27
    const lw = 25
    px(ctx, lx, dTop + 2, lw, dBottom - dTop - 2, P.woodDeep)
    // planks
    for (let i = 0; i < 4; i++) {
      const bx = lx + 1 + i * 6
      px(ctx, bx, dTop + 3, 5, dBottom - dTop - 5, i % 2 ? '#2a1a0f' : '#332012')
      px(ctx, bx + 5, dTop + 3, 1, dBottom - dTop - 5, '#120b06')
    }
    // iron bands
    for (const by of [dTop + 12, dBottom - 26]) {
      px(ctx, lx, by, lw, 5, P.plateDark)
      px(ctx, lx, by, lw, 1, P.plate)
      px(ctx, lx, by + 4, lw, 1, '#0d0f14')
      px(ctx, lx + 3, by + 1, 2, 2, P.stoneHi)
      px(ctx, lx + lw - 6, by + 1, 2, 2, P.stoneHi)
    }
    // ring handle
    const hx = leaf === 0 ? lx + lw - 6 : lx + 2
    outline(ctx, hx, dTop + 44, 5, 6, P.plateLit, 1)
    px(ctx, hx + 1, dTop + 42, 3, 2, P.plateDark)
  }

  // --- carved rune between the leaves ---
  const cx = dx + dw / 2
  px(ctx, cx - 1, dTop + 26, 2, 22, P.goldDark)
  pxLine(ctx, cx - 6, dTop + 34, cx - 1, dTop + 28, P.goldDark, 2)
  pxLine(ctx, cx + 6, dTop + 34, cx + 1, dTop + 28, P.goldDark, 2)
  px(ctx, cx - 1, dTop + 30, 2, 4, P.gold)

  // door frame shadow + threshold glow from whatever waits below
  px(ctx, dx, dTop, dw, 2, P.ink)
  px(ctx, dx, dBottom - 3, dw, 3, '#07100f')
  pxa(ctx, dx + 4, dBottom - 4, dw - 8, 2, P.spirit, 0.35)
  pxa(ctx, dx + 12, dBottom - 5, dw - 24, 1, P.spiritLit, 0.25)
}

function drawBanner(ctx: Ctx, x: number, y: number, h: number): void {
  const w = 18
  // rod
  px(ctx, x - 2, y, w + 4, 3, P.plateDark)
  px(ctx, x - 2, y, w + 4, 1, P.plateLit)
  // cloth
  px(ctx, x, y + 3, w, h, P.blood)
  px(ctx, x, y + 3, 2, h, P.bloodDeep)
  px(ctx, x + w - 2, y + 3, 2, h, P.bloodDeep)
  for (let i = 0; i < h; i += 6) {
    pxa(ctx, x + 2, y + 3 + i, w - 4, 1, '#ffffff', 0.05)
  }
  // gold trim
  px(ctx, x, y + 3, w, 1, P.gold)
  px(ctx, x + 1, y + 5, w - 2, 1, P.goldDark)
  // sigil: a sword driven point-down — the warden's mark
  const cx = x + w / 2
  px(ctx, cx - 2, y + 11, 4, 3, P.gold)
  px(ctx, cx - 2, y + 11, 4, 1, P.goldLit)
  px(ctx, cx - 1, y + 14, 2, 4, P.goldDark)
  px(ctx, cx - 6, y + 18, 12, 2, P.gold)
  px(ctx, cx - 6, y + 18, 12, 1, P.goldLit)
  px(ctx, cx - 2, y + 20, 4, 16, P.bone)
  px(ctx, cx - 2, y + 20, 1, 16, P.boneDim)
  px(ctx, cx - 1, y + 36, 2, 4, P.bone)
  px(ctx, cx, y + 40, 1, 2, P.boneDim)
  // ragged bottom
  const by = y + 3 + h
  px(ctx, x, by, w, 2, P.bloodDeep)
  for (let i = 0; i < w; i += 6) {
    px(ctx, x + i, by + 2, 3, 3, P.bloodDeep)
    px(ctx, x + i + 1, by + 5, 1, 2, P.bloodDeep)
  }
}

function drawTorchBracket(ctx: Ctx, x: number, y: number): void {
  // iron bracket on the wall
  px(ctx, x - 4, y + 10, 9, 3, P.plateDark)
  px(ctx, x - 4, y + 10, 9, 1, P.plate)
  px(ctx, x - 1, y + 12, 3, 6, P.plateDark)
  px(ctx, x - 5, y + 4, 2, 8, P.plateDark)
  px(ctx, x + 4, y + 4, 2, 8, P.plateDark)
  // wooden shaft + wrapping
  px(ctx, x - 2, y, 5, 12, P.woodDark)
  px(ctx, x - 2, y, 1, 12, P.wood)
  px(ctx, x - 2, y + 3, 5, 2, P.woodLit)
  px(ctx, x - 2, y + 8, 5, 2, P.woodLit)
  // coals
  px(ctx, x - 3, y - 2, 7, 3, P.emberDeep)
  px(ctx, x - 2, y - 2, 5, 1, P.ember)
}

function drawWeaponRack(ctx: Ctx): void {
  const x = 38
  const y = 106
  px(ctx, x, y, 26, 3, P.wood)
  px(ctx, x, y, 26, 1, P.woodLit)
  px(ctx, x, y + 3, 26, 1, P.ink)
  px(ctx, x, y + 26, 26, 3, P.wood)
  px(ctx, x, y + 26, 26, 1, P.woodLit)
  // three blades hanging
  for (let i = 0; i < 3; i++) {
    const bx = x + 4 + i * 8
    px(ctx, bx, y + 3, 2, 20, i === 1 ? P.stoneHi : P.stoneLit)
    px(ctx, bx, y + 3, 1, 20, P.bone)
    px(ctx, bx - 2, y + 22, 6, 2, P.goldDark)
    px(ctx, bx, y + 24, 2, 3, P.woodDark)
  }
}

function drawShelf(ctx: Ctx): void {
  const x = 128
  const y = 108
  px(ctx, x, y, 26, 3, P.wood)
  px(ctx, x, y, 26, 1, P.woodLit)
  px(ctx, x, y + 3, 26, 1, P.ink)
  px(ctx, x + 2, y + 3, 2, 3, P.woodDeep)
  px(ctx, x + 22, y + 3, 2, 3, P.woodDeep)
  // jars
  const jars: [number, string, string][] = [
    [2, P.tealDeep, P.tealLit],
    [10, P.emberDeep, P.emberLit],
    [18, P.spiritDeep, P.spiritLit],
  ]
  for (const [ox, body, lid] of jars) {
    px(ctx, x + ox, y - 9, 6, 9, body)
    px(ctx, x + ox, y - 9, 6, 2, lid)
    px(ctx, x + ox + 1, y - 6, 1, 5, lid)
    outline(ctx, x + ox, y - 9, 6, 9, P.ink, 1)
  }
}

function drawFloor(ctx: Ctx): void {
  const top = R.floorY
  px(ctx, 0, top, R.w, R.h - top, P.stoneDark)

  // rows get taller toward the viewer — a hint of depth without real perspective
  const rows = [10, 12, 14, 16, 20]
  let y = top
  rows.forEach((rh, ri) => {
    const tileW = 22 + ri * 4
    const offset = ri % 2 ? tileW / 2 : 0
    for (let x = -offset; x < R.w; x += tileW) {
      const n = noise2(x + ri * 31, ri * 7)
      const c = n > 0.66 ? P.stone : n > 0.3 ? '#3f382f' : '#37302a'
      px(ctx, x, y, tileW - 1, rh - 1, c)
      px(ctx, x, y, tileW - 1, 1, n > 0.5 ? P.stoneLit : '#4d4539')
      px(ctx, x + tileW - 1, y, 1, rh, P.stoneDeep)
      // cracks / chips
      if (n > 0.84) px(ctx, x + 4, y + 4, Math.floor(n * 8), 1, P.stoneDeep)
      if (n < 0.12) px(ctx, x + tileW - 8, y + rh - 5, 3, 2, P.stoneDeep)
    }
    px(ctx, 0, y + rh - 1, R.w, 1, P.stoneDeep)
    y += rh
  })

  // darken the back edge where floor meets wall
  pxa(ctx, 0, top, R.w, 6, '#000000', 0.4)
  pxa(ctx, 0, top, R.w, 3, '#000000', 0.3)
}

function drawStrawBed(ctx: Ctx): void {
  const x = 6
  const y = 158
  // mat
  px(ctx, x, y, 44, 18, P.strawDark)
  px(ctx, x, y, 44, 2, P.straw)
  outline(ctx, x, y, 44, 18, P.ink, 1)
  for (let i = 0; i < 40; i += 3) {
    const n = noise2(i, 5)
    px(ctx, x + 2 + i, y + 3 + Math.floor(n * 12), 3, 1, n > 0.5 ? P.strawLit : P.straw)
  }
  // rolled blanket
  px(ctx, x + 26, y - 5, 20, 8, P.tealDeep)
  px(ctx, x + 26, y - 5, 20, 2, P.teal)
  outline(ctx, x + 26, y - 5, 20, 8, P.ink, 1)
  // pillow
  px(ctx, x + 3, y - 4, 16, 7, P.boneDim)
  px(ctx, x + 3, y - 4, 16, 2, P.bone)
  outline(ctx, x + 3, y - 4, 16, 7, P.ink, 1)
}

function drawCauldronBody(ctx: Ctx): void {
  const x = 148
  const y = 150
  // tripod
  px(ctx, x + 2, y + 20, 3, 8, P.plateDark)
  px(ctx, x + 27, y + 20, 3, 8, P.plateDark)
  px(ctx, x + 14, y + 22, 3, 6, P.plateDark)
  // pot
  px(ctx, x, y + 4, 32, 18, '#16181e')
  px(ctx, x + 2, y + 22, 28, 3, '#16181e')
  px(ctx, x + 6, y + 25, 20, 2, '#0f1116')
  outline(ctx, x, y + 4, 32, 18, P.ink, 1)
  // rim
  px(ctx, x - 2, y, 36, 5, P.plateDark)
  px(ctx, x - 2, y, 36, 2, P.plateLit)
  px(ctx, x - 2, y + 4, 36, 1, P.ink)
  // stew surface
  px(ctx, x + 3, y + 2, 26, 2, P.emberDeep)
  px(ctx, x + 8, y + 2, 8, 1, P.ember)
  // highlight
  px(ctx, x + 2, y + 8, 2, 10, '#2a2f38')
}

/* --------------------------------------------------------------------------
   Cobwebs / grime when the hall is neglected
   -------------------------------------------------------------------------- */

function drawGrime(ctx: Ctx, level: number): void {
  if (level <= 0) return
  const a = level === 1 ? 0.55 : 1

  // cobwebs in the two upper corners of the hall
  for (const [ox, flip] of [
    [0, false],
    [R.w - 22, true],
  ] as [number, boolean][]) {
    const web = `rgba(198,188,164,${a * 0.34})`
    for (let i = 0; i < 6; i++) {
      const len = 5 + i * 3
      const y = 14 + i * 3
      pxa(ctx, flip ? ox + 22 - len : ox, y, len, 1, P.boneDim, a * 0.3)
    }
    pxLine(ctx, flip ? ox + 22 : ox, 12, flip ? ox : ox + 22, 34, web, 1)
    pxLine(ctx, flip ? ox + 22 : ox, 12, flip ? ox + 6 : ox + 16, 36, web, 1)
  }

  // damp running down the boards
  for (const dx of [46, 118, 148]) {
    const h = 20 + ((dx * 7) % 14)
    pxa(ctx, dx, 44, 2, h, '#1b1408', a * 0.5)
    pxa(ctx, dx + 2, 44, 1, h - 6, '#241a0c', a * 0.35)
    pxa(ctx, dx - 1, 44 + h - 4, 4, 3, '#1b1408', a * 0.4)
  }

  // floor muck: dark patches with a sour green-brown cast
  const bandH = R.h - R.floorY - 8
  for (let i = 0; i < 22 * level; i++) {
    const n = noise2(i * 3.7, 91)
    const m = noise2(91, i * 2.3)
    const x = Math.floor(n * (R.w - 10))
    const y = R.floorY + 5 + Math.floor(m * bandH)
    const w = 3 + Math.floor(noise2(i, 5) * 5)
    pxa(ctx, x, y, w, 2, '#332b16', a * 0.75)
    pxa(ctx, x + 1, y - 1, w - 2, 1, '#3d3419', a * 0.45)
  }

  // spilled slop by the hearth and crumbs by the mat, the two places he eats
  pxa(ctx, 140, R.floorY + 16, 14, 3, '#3a2f14', a * 0.8)
  pxa(ctx, 143, R.floorY + 14, 8, 2, '#463a1a', a * 0.6)
  for (let i = 0; i < 5 * level; i++) {
    pxa(ctx, 14 + i * 7, R.floorY + 9 + ((i * 5) % 9), 2, 2, '#4a3d1c', a * 0.7)
  }
}

/* --------------------------------------------------------------------------
   The bands above and below the hall
   -------------------------------------------------------------------------- */

/** Unlit rafter space above the ceiling beam. Canvas coordinates. */
function drawRafters(ctx: Ctx): void {
  px(ctx, 0, 0, R.w, VOID_H, '#080604')

  // upper wall boards, barely lit
  for (let i = 0; i * 16 < R.w; i++) {
    const x = i * 16
    const n = noise2(i, 17)
    px(ctx, x, 0, 16, VOID_H, n > 0.5 ? '#120b06' : '#0d0805')
    px(ctx, x, 0, 1, VOID_H, '#070402')
    px(ctx, x + 1, 0, 1, VOID_H, '#1a1008')
  }

  // three rafters running across, the lowest one catching the most light
  const rafters: [number, string, string][ ] = [
    [6, '#150d07', '#1e130a'],
    [24, '#1a1009', '#261709'],
    [40, '#22150b', '#33200f'],
  ]
  for (const [y, body, lit] of rafters) {
    px(ctx, 0, y, R.w, 6, body)
    px(ctx, 0, y, R.w, 1, lit)
    px(ctx, 0, y + 5, R.w, 1, '#050302')
    // iron straps
    for (let x = 14; x < R.w; x += 46) {
      px(ctx, x, y, 3, 6, '#161a20')
      px(ctx, x, y, 3, 1, '#232932')
    }
  }

  // two chains hanging out of the dark, each ending in a shuttered lantern
  for (const l of LAMPS) {
    for (let y = 0; y < l.y - 8; y += 4) {
      px(ctx, l.x, y, 2, 3, y % 8 === 0 ? '#2a3038' : '#1a1f26')
    }
    drawLantern(ctx, l.x, l.y)
  }

  // heavy gloom, dithered so it never reads as a CSS gradient
  for (let i = 0; i < 6; i++) {
    dither(ctx, 0, 0, R.w, 6 + i * 4, '#000000', 1, 0.13)
  }
}

/** Hanging lanterns in the rafter void. Canvas coordinates, tops of the caps. */
const LAMPS = [
  { x: 50, y: 36 },
  { x: 142, y: 36 },
] as const

function drawLantern(ctx: Ctx, x: number, y: number): void {
  const c = x + 1 // centre of the 2px chain
  // hook + ring
  px(ctx, c - 2, y - 6, 4, 2, '#232932')
  outline(ctx, c - 3, y - 4, 6, 5, '#1d2229', 1)
  // cap
  px(ctx, c - 6, y, 12, 3, '#232932')
  px(ctx, c - 6, y, 12, 1, '#333b46')
  px(ctx, c - 4, y + 3, 8, 1, '#1a1f26')
  // cage: two iron posts with a smoked pane between them
  pxa(ctx, c - 3, y + 3, 6, 10, '#3a2410', 0.85)
  px(ctx, c - 5, y + 3, 2, 10, '#1d2229')
  px(ctx, c + 3, y + 3, 2, 10, '#1d2229')
  px(ctx, c - 3, y + 7, 6, 1, '#2a3038')
  // candle stub
  px(ctx, c - 1, y + 9, 3, 4, P.boneDeep)
  // base
  px(ctx, c - 6, y + 13, 12, 2, '#232932')
  px(ctx, c - 6, y + 14, 12, 1, '#0d1014')
}

/** Floor in front of the hall, closest to the viewer. Canvas coordinates. */
function drawForeground(ctx: Ctx): void {
  const top = VOID_H + R.h
  px(ctx, 0, top, R.w, FORE_H, P.stoneDark)

  // two courses of big flagstones
  let y = top
  for (const [rh, tileW, off] of [
    [11, 46, 0],
    [13, 54, 27],
  ] as [number, number, number][]) {
    for (let x = -off; x < R.w; x += tileW) {
      const n = noise2(x + rh * 13, rh)
      px(ctx, x, y, tileW - 2, rh - 1, n > 0.6 ? P.stone : n > 0.28 ? '#3d362f' : '#342d27')
      px(ctx, x, y, tileW - 2, 1, n > 0.5 ? P.stoneLit : '#4a4236')
      px(ctx, x + tileW - 2, y, 2, rh, P.stoneDeep)
      if (n > 0.8) px(ctx, x + 8, y + 5, Math.floor(n * 12), 1, P.stoneDeep)
    }
    px(ctx, 0, y + rh - 1, R.w, 1, P.stoneDeep)
    y += rh
  }

  // the very front edge falls into shadow
  for (let i = 0; i < 5; i++) {
    dither(ctx, 0, SCENE.h - (2 + i * 3), R.w, 2 + i * 3, '#000000', 1, 0.16)
  }
}

/* --------------------------------------------------------------------------
   Static layer cache
   -------------------------------------------------------------------------- */

const staticCache = new Map<number, HTMLCanvasElement>()

function buildStatic(grime: number): HTMLCanvasElement {
  const cv = document.createElement('canvas')
  cv.width = SCENE.w
  cv.height = SCENE.h
  const ctx = cv.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  drawRafters(ctx)

  ctx.save()
  ctx.translate(0, VOID_H)
  drawWall(ctx)
  drawCeiling(ctx)
  drawArchAndDoor(ctx)
  drawBanner(ctx, 6, 26, 52)
  drawBanner(ctx, 168, 26, 52)
  drawWeaponRack(ctx)
  drawShelf(ctx)
  drawSkirting(ctx)
  drawFloor(ctx)
  drawStrawBed(ctx)
  drawCauldronBody(ctx)
  drawTorchBracket(ctx, 26, 82)
  drawTorchBracket(ctx, 166, 82)
  drawGrime(ctx, grime)
  ctx.restore()

  drawForeground(ctx)

  return cv
}

function getStatic(grime: number): HTMLCanvasElement {
  let cv = staticCache.get(grime)
  if (!cv) {
    cv = buildStatic(grime)
    staticCache.set(grime, cv)
  }
  return cv
}

/* --------------------------------------------------------------------------
   Public draw
   -------------------------------------------------------------------------- */

export interface RoomOpts {
  /** ms timestamp for animation */
  t: number
  /** 0 = clean, 1 = grubby, 2 = filthy */
  grime: number
  /** 0..1 extra darkness (used while he sleeps) */
  dim: number
  /** 0..1 how strongly the spirit energy is glowing */
  spirit: number
  /** horizontal offset of the character, so his shadow walks with him */
  heroShift?: number
  /** 0..1 shadow strength — folded up on the mat he barely casts one */
  heroShadow?: number
}

export function drawRoom(ctx: Ctx, o: RoomOpts): void {
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(getStatic(o.grime), 0, 0)

  const flick = 0.82 + Math.sin(o.t / 130) * 0.1 + Math.sin(o.t / 57) * 0.08
  const lightStrength = (1 - o.dim * 0.75) * flick

  // lantern candles in the rafters — the only light up there. Canvas space.
  for (const l of LAMPS) {
    const c = l.x + 1
    const h = 3 + (Math.floor(o.t / 120 + c) % 3)
    lightPool(ctx, c, l.y + 8, 20, P.ember, 0.12 * lightStrength)
    pxa(ctx, c - 1, l.y + 9 - h, 3, h, P.emberLit, 0.92 * lightStrength)
    pxa(ctx, c, l.y + 8 - h, 1, 2, P.emberPale, 0.8 * lightStrength)
  }

  // everything below is authored in room space
  ctx.save()
  ctx.translate(0, VOID_H)

  // torch flames + their light
  for (const [x, seed] of [
    [26, 0.1],
    [166, 0.7],
  ] as [number, number][]) {
    lightPool(ctx, x, 84, 34, P.ember, 0.16 * lightStrength)
    flame(ctx, x - 3, 70, o.t, seed)
    // pool on the floor beneath
    lightPool(ctx, x, R.floorY + 16, 30, P.emberLit, 0.1 * lightStrength)
  }

  // cauldron fire under the pot
  const fx = 156
  const fy = 176
  for (let i = 0; i < 4; i++) {
    const w = 3 + ((Math.floor(o.t / 90) + i) % 3)
    pxa(ctx, fx + i * 5, fy - w, 4, w, i % 2 ? P.emberLit : P.ember, 0.9)
  }
  pxa(ctx, fx - 2, fy, 26, 2, P.emberDeep, 0.9)
  lightPool(ctx, 164, 172, 26, P.emberLit, 0.14 * lightStrength)

  // steam off the stew
  for (let i = 0; i < 3; i++) {
    const ph = (o.t / 26 + i * 22) % 44
    pxa(ctx, 156 + i * 7 + Math.round(Math.sin((o.t / 240) + i) * 2), 150 - ph, 2, 2, P.boneDim, Math.max(0, 0.4 - ph / 110))
  }

  // spirit light bleeding under the door
  if (o.spirit > 0.05) {
    lightPool(ctx, 96, 140, 26 + o.spirit * 10, P.spirit, 0.1 * o.spirit)
  }

  ctx.restore()

  // hero drop shadow (drawn before the sprite by the caller's ordering)
  const shade = o.heroShadow ?? 1
  if (shade > 0.03) {
    const hx = SCENE.heroX + Math.round(o.heroShift ?? 0)
    pxa(ctx, hx - 17, SCENE.heroY - 3, 34, 5, '#000000', 0.45 * shade)
    pxa(ctx, hx - 11, SCENE.heroY, 22, 2, '#000000', 0.4 * shade)
  }
}

/** Foreground pass: vignette + optional darkness. Drawn after the character. */
export function drawRoomOverlay(ctx: Ctx, o: RoomOpts): void {
  // edge vignette, dithered so it never looks like a CSS gradient
  for (let i = 0; i < 5; i++) {
    const a = 0.14 - i * 0.024
    dither(ctx, 0, 0, R.w, 3 + i * 3, '#000000', 1, a)
    dither(ctx, 0, SCENE.h - (3 + i * 3), R.w, 3 + i * 3, '#000000', 1, a)
    dither(ctx, 0, 0, 3 + i * 3, SCENE.h, '#000000', 1, a)
    dither(ctx, R.w - (3 + i * 3), 0, 3 + i * 3, SCENE.h, '#000000', 1, a)
  }
  if (o.dim > 0.01) {
    pxa(ctx, 0, 0, R.w, SCENE.h, '#04070c', o.dim * 0.72)
  }
}
