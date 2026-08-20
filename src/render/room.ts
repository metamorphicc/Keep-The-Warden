import { P } from '../styles/palette'
import { dither, lightPool, noise2, outline, px, pxa, pxLine, type Ctx } from './draw'

/* ==========================================================================
   The Desk - a single low-resolution trader apartment, drawn procedurally.
   Static geometry is rendered once into an offscreen canvas and blitted every
   frame; only monitor glow, city lights, coffee steam and status LEDs animate.

   Internal hotspot names are intentionally preserved so tap behavior and the
   rest of the game do not move while the visual scene changes.
   ========================================================================== */

const R = { w: 192, h: 208, floorY: 152 } as const
const VOID_H = 56
const FORE_H = 24

export const SCENE = {
  w: R.w,
  h: VOID_H + R.h + FORE_H,
  floorY: VOID_H + R.floorY,
  heroX: 96,
  heroY: VOID_H + 182,
} as const

export const HOTSPOTS = {
  hero: { x: 74, y: VOID_H + 118, w: 44, h: 66 },
  urn: { x: 144, y: VOID_H + 142, w: 42, h: 38 },
  terminal: { x: 26, y: VOID_H + 58, w: 140, h: 70 },
  bed: { x: 4, y: VOID_H + 148, w: 50, h: 34 },
  torchL: { x: 12, y: VOID_H + 62, w: 20, h: 42 },
  torchR: { x: 160, y: VOID_H + 62, w: 20, h: 42 },
  door: { x: 50, y: VOID_H + 28, w: 92, h: 88 },
} as const

export type HotspotName = keyof typeof HOTSPOTS

export function hitTest(x: number, y: number): HotspotName | null {
  const order: HotspotName[] = ['hero', 'urn', 'terminal', 'bed', 'torchL', 'torchR', 'door']
  for (const name of order) {
    const h = HOTSPOTS[name]
    if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return name
  }
  return null
}

const MONITORS = [
  { x: 35, y: 74, w: 40, h: 28, hue: P.tealLit },
  { x: 76, y: 62, w: 42, h: 36, hue: P.spiritLit },
  { x: 119, y: 76, w: 38, h: 26, hue: P.tealLit },
] as const

const LEDS = [
  { x: 22, y: 82 },
  { x: 170, y: 82 },
] as const

/* --------------------------------------------------------------------------
   Static apartment shell
   -------------------------------------------------------------------------- */

function drawCeilingVoid(ctx: Ctx): void {
  px(ctx, 0, 0, R.w, VOID_H, '#05080d')

  for (let y = 0; y < VOID_H; y += 8) {
    const c = y < 24 ? '#080c12' : '#0b1119'
    px(ctx, 0, y, R.w, 7, c)
    px(ctx, 0, y + 7, R.w, 1, '#030509')
  }

  // cable tray above the workstation
  px(ctx, 26, 22, 140, 5, P.plateDeep)
  px(ctx, 26, 22, 140, 1, P.plateLit)
  for (let x = 32; x < 164; x += 13) {
    px(ctx, x, 22, 2, 5, P.plate)
  }

  // two quiet status bars, not flames
  for (const l of LEDS) {
    px(ctx, l.x - 7, 36, 16, 4, P.plateDeep)
    px(ctx, l.x - 7, 36, 16, 1, P.plateLit)
    px(ctx, l.x - 4, 40, 10, 1, P.ink)
  }

  for (let i = 0; i < 5; i++) {
    dither(ctx, 0, 0, R.w, 8 + i * 4, '#000000', 1, 0.12)
  }
}

function drawWall(ctx: Ctx): void {
  const top = 16
  const bottom = 140
  px(ctx, 0, top, R.w, bottom - top, '#151d26')

  for (let i = 0; i * 16 < R.w; i++) {
    const x = i * 16
    const shade = noise2(i, 4)
    const base = shade > 0.62 ? '#1b2630' : shade > 0.3 ? '#17212b' : '#121a23'
    px(ctx, x, top, 16, bottom - top, base)
    px(ctx, x, top, 1, bottom - top, '#0a0f15')
    px(ctx, x + 15, top, 1, bottom - top, '#0d1218')
    if (i % 3 === 0) pxa(ctx, x + 4, top + 8, 8, bottom - top - 18, '#ffffff', 0.025)
  }

  // lower acoustic strip
  px(ctx, 0, 102, R.w, 8, '#101720')
  px(ctx, 0, 102, R.w, 1, P.plateLit)
  px(ctx, 0, 109, R.w, 1, P.ink)
  for (let x = 5; x < R.w; x += 18) px(ctx, x, 105, 4, 2, '#263340')

  // top shadow from the ceiling void
  for (let y = top; y < top + 28; y++) {
    pxa(ctx, 0, y, R.w, 1, '#000000', 0.46 * (1 - (y - top) / 28))
  }
}

function drawCityWindow(ctx: Ctx): void {
  const x = 51
  const y = 28
  const w = 90
  const h = 80

  outline(ctx, x - 3, y - 3, w + 6, h + 6, P.ink, 2)
  px(ctx, x - 1, y - 1, w + 2, h + 2, P.plateDark)
  px(ctx, x, y, w, h, '#07111f')

  // glass depth
  for (let j = 0; j < h; j++) {
    const c = j < 22 ? '#0a1830' : j < 52 ? '#081425' : '#07101c'
    px(ctx, x, y + j, w, 1, c)
  }

  // mullions and blinds
  px(ctx, x + 43, y, 3, h, P.plateDark)
  px(ctx, x, y + 31, w, 2, P.plateDark)
  for (let by = y + 8; by < y + 62; by += 13) {
    pxa(ctx, x + 3, by, w - 6, 1, P.spiritPale, 0.12)
  }

  // skyline
  for (let i = 0; i < 11; i++) {
    const bw = 5 + Math.floor(noise2(i, 20) * 8)
    const bh = 18 + Math.floor(noise2(i, 26) * 26)
    const bx = x + 4 + i * 8
    const by = y + h - bh - 4
    px(ctx, bx, by, bw, bh, noise2(i, 33) > 0.5 ? '#0d2132' : '#0a1a29')
    px(ctx, bx, by, bw, 1, '#17314a')
    for (let wy = by + 4; wy < y + h - 6; wy += 7) {
      if (noise2(i * 7, wy) > 0.42) px(ctx, bx + 2, wy, Math.max(1, bw - 4), 1, '#8ab5ce')
    }
  }

  // sill ready for later upgrades
  px(ctx, x - 7, y + h + 2, w + 14, 6, P.stoneDark)
  px(ctx, x - 7, y + h + 2, w + 14, 1, P.stoneHi)
  px(ctx, x + 5, y + h + 5, w - 10, 1, P.ink)
}

function drawSideLight(ctx: Ctx, x: number, y: number, flip = false): void {
  outline(ctx, x - 4, y - 4, 22, 42, P.ink, 1)
  px(ctx, x - 3, y - 3, 20, 40, '#0a121b')
  for (let i = 0; i < 5; i++) {
    const yy = y + i * 7
    px(ctx, x, yy, 14, 3, i % 2 ? P.spiritDeep : P.tealDeep)
    pxa(ctx, x + (flip ? 2 : 8), yy, 4, 3, P.spiritLit, 0.32)
  }
  px(ctx, x + 3, y + 36, 8, 2, P.plate)
}

function drawNotesBoard(ctx: Ctx): void {
  const x = 9
  const y = 36
  outline(ctx, x, y, 32, 55, P.ink, 1)
  px(ctx, x + 1, y + 1, 30, 53, '#16120d')
  px(ctx, x + 1, y + 1, 30, 2, P.woodLit)
  for (let i = 0; i < 7; i++) {
    const nx = x + 4 + (i % 2) * 13
    const ny = y + 6 + Math.floor(i / 2) * 11
    const c = i % 3 === 0 ? P.goldLit : i % 3 === 1 ? P.bone : P.tealLit
    px(ctx, nx, ny, 10, 8, c)
    px(ctx, nx, ny, 10, 1, '#fff6bf')
    px(ctx, nx + 2, ny + 3, 6, 1, P.ink)
    if (i % 2 === 0) px(ctx, nx + 2, ny + 5, 4, 1, P.ink)
  }
  pxLine(ctx, x + 26, y + 48, x + 39, y + 72, P.plateDark, 2)
}

function drawMonitorCase(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  outline(ctx, x, y, w, h, P.ink, 2)
  px(ctx, x + 2, y + 2, w - 4, h - 4, P.plateDark)
  px(ctx, x + 3, y + 3, w - 6, h - 8, '#061018')
  px(ctx, x + 3, y + h - 5, w - 6, 2, P.plate)
  px(ctx, x + Math.floor(w / 2) - 2, y + h, 4, 8, P.plateDark)
  px(ctx, x + Math.floor(w / 2) - 8, y + h + 7, 16, 3, P.plateDeep)
}

function drawMonitorBank(ctx: Ctx): void {
  for (const m of MONITORS) drawMonitorCase(ctx, m.x, m.y, m.w, m.h)

  // a small laptop angled on the right side of the desk
  px(ctx, 129, 119, 28, 11, P.plateDark)
  px(ctx, 131, 121, 24, 6, '#07131b')
  px(ctx, 127, 130, 34, 5, P.plate)
  px(ctx, 127, 134, 34, 1, P.ink)
}

function drawDesk(ctx: Ctx): void {
  const y = 133
  px(ctx, 22, y, 148, 12, P.wood)
  px(ctx, 22, y, 148, 2, P.woodHi)
  px(ctx, 22, y + 10, 148, 2, P.woodDeep)
  outline(ctx, 22, y, 148, 12, P.ink, 1)

  // drawers and upgradeable empty bay
  px(ctx, 27, y + 12, 36, 28, P.woodDark)
  px(ctx, 130, y + 12, 34, 28, P.woodDark)
  outline(ctx, 27, y + 12, 36, 28, P.ink, 1)
  outline(ctx, 130, y + 12, 34, 28, P.ink, 1)
  px(ctx, 39, y + 21, 12, 2, P.goldDark)
  px(ctx, 141, y + 21, 12, 2, P.goldDark)
  px(ctx, 70, y + 16, 48, 18, '#10171f')
  outline(ctx, 70, y + 16, 48, 18, P.ink, 1)
  px(ctx, 77, y + 22, 34, 1, P.stoneHi)
  px(ctx, 77, y + 27, 24, 1, P.stoneLit)

  // keyboard and loose paper
  px(ctx, 66, y + 3, 48, 8, P.plateDeep)
  for (let x = 69; x < 110; x += 5) px(ctx, x, y + 5, 3, 2, P.plateLit)
  px(ctx, 48, y + 4, 15, 9, P.bone)
  px(ctx, 50, y + 7, 10, 1, P.ink)
  px(ctx, 50, y + 10, 7, 1, P.ink)

  drawCables(ctx)
}

function drawCables(ctx: Ctx): void {
  const base = R.floorY + 3
  pxLine(ctx, 54, 145, 68, base + 5, P.plateDeep, 2)
  pxLine(ctx, 112, 145, 124, base + 12, P.plateDeep, 2)
  pxLine(ctx, 132, 145, 154, base + 8, P.plateDeep, 2)
  pxLine(ctx, 28, base + 18, 76, base + 23, '#0a0d12', 2)
  pxLine(ctx, 98, base + 14, 145, base + 20, '#0a0d12', 2)
  px(ctx, 82, base + 18, 13, 7, P.plateDark)
  px(ctx, 84, base + 20, 2, 2, P.tealLit)
  px(ctx, 89, base + 20, 2, 2, P.emberLit)
}

function drawFloor(ctx: Ctx): void {
  const top = R.floorY
  px(ctx, 0, top, R.w, R.h - top, '#131a21')

  const rows = [10, 12, 14, 16, 20]
  let y = top
  rows.forEach((rh, ri) => {
    const plankW = 28 + ri * 4
    const offset = ri % 2 ? plankW / 2 : 0
    for (let x = -offset; x < R.w; x += plankW) {
      const n = noise2(x + ri * 17, ri * 11)
      const c = n > 0.62 ? '#1c2530' : n > 0.3 ? '#18212a' : '#141c24'
      px(ctx, x, y, plankW - 1, rh - 1, c)
      px(ctx, x, y, plankW - 1, 1, n > 0.48 ? '#263340' : '#202a34')
      px(ctx, x + plankW - 1, y, 1, rh, '#0d1218')
    }
    px(ctx, 0, y + rh - 1, R.w, 1, '#0d1218')
    y += rh
  })

  // desk rug
  px(ctx, 44, top + 18, 103, 33, '#191822')
  outline(ctx, 44, top + 18, 103, 33, P.ink, 1)
  for (let x = 50; x < 142; x += 10) pxa(ctx, x, top + 22, 3, 25, P.spiritDeep, 0.28)
  pxa(ctx, 54, top + 30, 84, 5, P.spirit, 0.08)

  pxa(ctx, 0, top, R.w, 5, '#000000', 0.36)
}

function drawChair(ctx: Ctx): void {
  const x = 10
  const y = 152
  // reclined office chair where recover lands
  px(ctx, x + 16, y - 10, 22, 24, P.plateDark)
  px(ctx, x + 16, y - 10, 3, 24, P.plateLit)
  px(ctx, x + 19, y - 8, 17, 18, '#202a35')
  outline(ctx, x + 16, y - 10, 22, 24, P.ink, 1)
  px(ctx, x + 6, y + 7, 34, 10, P.plateDark)
  px(ctx, x + 6, y + 7, 34, 2, P.plateLit)
  outline(ctx, x + 6, y + 7, 34, 10, P.ink, 1)
  px(ctx, x + 22, y + 17, 5, 14, P.plateDeep)
  pxLine(ctx, x + 24, y + 28, x + 9, y + 34, P.plateDeep, 2)
  pxLine(ctx, x + 24, y + 28, x + 40, y + 34, P.plateDeep, 2)
  px(ctx, x + 7, y + 34, 5, 3, P.ink)
  px(ctx, x + 38, y + 34, 5, 3, P.ink)
  px(ctx, x + 1, y + 11, 9, 4, P.plateDark)
}

function drawCoffeeStack(ctx: Ctx): void {
  const x = 148
  const y = 146

  // tiny side table and machine
  px(ctx, x - 2, y + 15, 34, 8, P.woodDark)
  px(ctx, x - 2, y + 15, 34, 2, P.woodHi)
  outline(ctx, x - 2, y + 15, 34, 8, P.ink, 1)
  px(ctx, x + 8, y - 2, 18, 20, P.plateDark)
  px(ctx, x + 8, y - 2, 18, 2, P.plateLit)
  outline(ctx, x + 8, y - 2, 18, 20, P.ink, 1)
  px(ctx, x + 12, y + 3, 10, 6, '#061018')
  px(ctx, x + 14, y + 5, 6, 1, P.tealLit)
  px(ctx, x + 11, y + 12, 12, 3, P.ink)

  // mug
  px(ctx, x + 1, y + 6, 10, 11, P.goldDark)
  px(ctx, x + 1, y + 6, 10, 2, P.goldLit)
  px(ctx, x + 10, y + 8, 4, 5, P.goldDark)
  outline(ctx, x + 1, y + 6, 10, 11, P.ink, 1)
  px(ctx, x + 3, y + 8, 6, 2, '#3b2415')

  // note stack
  px(ctx, x + 2, y + 23, 25, 5, P.boneDim)
  px(ctx, x + 4, y + 21, 20, 5, P.bone)
  px(ctx, x + 7, y + 23, 12, 1, P.ink)
}

function drawSkirting(ctx: Ctx): void {
  const y = 140
  px(ctx, 0, y, R.w, 12, P.stoneDeep)
  px(ctx, 0, y, R.w, 1, P.ink)
  px(ctx, 0, y + 2, R.w, 2, P.stoneLit)
  for (let x = 4; x < R.w; x += 22) {
    px(ctx, x, y + 6, 12, 2, P.plateDark)
  }
  px(ctx, 0, y + 11, R.w, 1, P.ink)
}

function drawGrime(ctx: Ctx, level: number): void {
  if (level <= 0) return
  const a = level === 1 ? 0.55 : 1

  // more heat means more paper, spills and ugly cable loops
  for (let i = 0; i < 6 * level; i++) {
    const n = noise2(i * 4.1, 52)
    const x = 16 + Math.floor(n * 154)
    const y = R.floorY + 8 + Math.floor(noise2(77, i) * 34)
    pxa(ctx, x, y, 5, 3, i % 2 ? P.boneDim : P.goldLit, a * 0.55)
    pxa(ctx, x + 1, y + 1, 3, 1, P.ink, a * 0.45)
  }

  pxa(ctx, 143, R.floorY + 15, 17, 4, '#3a2415', a * 0.8)
  pxa(ctx, 146, R.floorY + 13, 9, 2, '#4c311c', a * 0.58)

  for (let i = 0; i < 4 * level; i++) {
    const y = R.floorY + 18 + i * 4
    pxLine(ctx, 52 + i * 9, y, 88 + i * 8, y + (i % 2 ? -5 : 6), '#080b10', 1)
  }

  if (level > 1) {
    for (const x of [28, 119, 154]) {
      pxa(ctx, x, 44, 2, 24, '#070b10', 0.45)
      pxa(ctx, x + 2, 47, 1, 18, '#0a1017', 0.32)
    }
  }
}

function drawForeground(ctx: Ctx): void {
  const top = VOID_H + R.h
  px(ctx, 0, top, R.w, FORE_H, '#111820')

  let y = top
  for (const [rh, tileW, off] of [
    [11, 48, 0],
    [13, 56, 28],
  ] as [number, number, number][]) {
    for (let x = -off; x < R.w; x += tileW) {
      const n = noise2(x + rh * 9, rh)
      px(ctx, x, y, tileW - 2, rh - 1, n > 0.58 ? '#18212b' : '#131b24')
      px(ctx, x, y, tileW - 2, 1, '#263340')
      px(ctx, x + tileW - 2, y, 2, rh, '#0b1016')
    }
    px(ctx, 0, y + rh - 1, R.w, 1, '#0b1016')
    y += rh
  }

  // foreground cable roll
  pxLine(ctx, 12, top + 15, 46, top + 18, '#070a0f', 2)
  pxLine(ctx, 136, top + 12, 178, top + 19, '#070a0f', 2)

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

  drawCeilingVoid(ctx)

  ctx.save()
  ctx.translate(0, VOID_H)
  drawWall(ctx)
  drawCityWindow(ctx)
  drawSideLight(ctx, 17, 66)
  drawSideLight(ctx, 161, 66, true)
  drawNotesBoard(ctx)
  drawMonitorBank(ctx)
  drawSkirting(ctx)
  drawDesk(ctx)
  drawFloor(ctx)
  drawChair(ctx)
  drawCoffeeStack(ctx)
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
  t: number
  grime: number
  dim: number
  edge: number
  heroShift?: number
  heroShadow?: number
}

export function drawRoom(ctx: Ctx, o: RoomOpts): void {
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(getStatic(o.grime), 0, 0)

  const flick = 0.86 + Math.sin(o.t / 180) * 0.08 + Math.sin(o.t / 67) * 0.05
  const lightStrength = (1 - o.dim * 0.72) * flick

  // status LEDs in the ceiling void
  for (const l of LEDS) {
    const on = Math.sin(o.t / 520 + l.x) > -0.35
    pxa(ctx, l.x - 4, 40, 10, 1, on ? P.tealLit : P.spirit, on ? 0.72 : 0.25)
    lightPool(ctx, l.x + 1, 42, 18, P.tealLit, 0.06 * lightStrength)
  }

  ctx.save()
  ctx.translate(0, VOID_H)

  // monitor charts
  const feed = 0.42 + o.edge * 0.58
  MONITORS.forEach((m, mi) => {
    const scan = Math.floor(o.t / (150 + mi * 25)) % 4
    const sx = m.x + 5
    const sy = m.y + 6
    const sw = m.w - 10
    const sh = m.h - 13
    pxa(ctx, sx, sy, sw, sh, mi === 1 ? P.spiritDeep : P.tealDeep, 0.22 * feed)
    for (let r = 0; r < 4; r++) {
      const y = sy + 3 + r * Math.max(3, Math.floor(sh / 5))
      const rowW = 7 + ((Math.floor(o.t / 360) + r * 3 + mi) % Math.max(8, sw - 5))
      pxa(ctx, sx + 2, y, Math.min(rowW, sw - 4), 1, m.hue, feed * (r === scan ? 0.95 : 0.42))
    }
    for (let i = 0; i < 4; i++) {
      const x0 = sx + 3 + i * Math.floor(sw / 5)
      const y0 = sy + sh - 3 - ((i * 5 + Math.floor(o.t / 260) + mi * 3) % Math.max(5, sh - 4))
      const x1 = sx + 6 + (i + 1) * Math.floor(sw / 5)
      const y1 = sy + sh - 4 - (((i + 1) * 7 + Math.floor(o.t / 260) + mi * 3) % Math.max(5, sh - 4))
      pxLine(ctx, x0, y0, x1, y1, mi === 1 ? P.spiritLit : P.tealLit, 1)
    }
    lightPool(ctx, m.x + m.w / 2, m.y + m.h / 2, 22 + mi * 2, m.hue, 0.06 * feed * lightStrength)
  })

  // laptop pulse
  pxa(ctx, 133, 122, 17 + (Math.floor(o.t / 420) % 5), 1, P.greenLit, 0.62 * feed)
  pxa(ctx, 133, 125, 10, 1, P.tealLit, 0.42 * feed)

  // city window lights
  if (o.edge > 0.05) {
    for (let i = 0; i < 10; i++) {
      const x = 57 + i * 8
      const y = 70 + Math.floor(noise2(i, Math.floor(o.t / 900)) * 30)
      pxa(ctx, x, y, 4, 1, i % 3 === 0 ? P.goldLit : P.spiritLit, 0.16 + o.edge * 0.3)
    }
    lightPool(ctx, 96, 108, 34 + o.edge * 12, P.spirit, 0.08 * o.edge)
  }

  // coffee steam
  for (let i = 0; i < 3; i++) {
    const ph = (o.t / 28 + i * 20) % 42
    pxa(
      ctx,
      152 + i * 4 + Math.round(Math.sin(o.t / 230 + i) * 2),
      151 - ph,
      2,
      2,
      P.boneDim,
      Math.max(0, 0.38 - ph / 105),
    )
  }

  ctx.restore()

  const shade = o.heroShadow ?? 1
  if (shade > 0.03) {
    const hx = SCENE.heroX + Math.round(o.heroShift ?? 0)
    pxa(ctx, hx - 17, SCENE.heroY - 3, 34, 5, '#000000', 0.45 * shade)
    pxa(ctx, hx - 11, SCENE.heroY, 22, 2, '#000000', 0.4 * shade)
  }
}

export function drawRoomOverlay(ctx: Ctx, o: RoomOpts): void {
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
