import { P } from '../styles/palette'
import { dither, drawMatrix, lightPool, noise2, outline, px, pxa, pxLine, type Ctx } from './draw'

/* ==========================================================================
   The training pit — a smaller scene for the mini-game. One straw dummy on a
   post, two braziers, sand floor. The dummy recoils when struck and its head
   swings on a delay.
   ========================================================================== */

export const PIT = {
  w: 160,
  h: 176,
  floorY: 118,
  dummyX: 80,
  /** the base of the post */
  dummyY: 152,
} as const

/** Generous tap area — this is a rhythm tapper, not a precision test. */
export const DUMMY_BOX = { x: 40, y: 42, w: 80, h: 100 } as const

export function dummyHitTest(x: number, y: number): boolean {
  return (
    x >= DUMMY_BOX.x &&
    x <= DUMMY_BOX.x + DUMMY_BOX.w &&
    y >= DUMMY_BOX.y &&
    y <= DUMMY_BOX.y + DUMMY_BOX.h
  )
}

const FIRE_CHARS: Record<string, string> = {
  a: P.emberDeep,
  b: P.ember,
  c: P.emberLit,
  d: P.emberPale,
}

const BRAZIER_FLAME: readonly string[][] = [
  ['..d..', '.dcd.', '.ccb.', 'bcccb', 'abbba', '.aaa.'],
  ['.d...', '.dcd.', 'dccb.', 'bcccb', 'abbba', '.aaa.'],
  ['...d.', '.dcd.', '.bccd', 'bcccb', 'abbba', '.aaa.'],
]

/* --------------------------------------------------------------------------
   Static layer
   -------------------------------------------------------------------------- */

function drawBackWall(ctx: Ctx): void {
  px(ctx, 0, 0, PIT.w, PIT.floorY, P.stoneDeep)
  // stone blocks
  for (let row = 0; row * 14 < PIT.floorY; row++) {
    const y = row * 14
    const off = row % 2 ? 13 : 0
    for (let x = -off; x < PIT.w; x += 26) {
      const n = noise2(x + row * 17, row * 5)
      px(ctx, x + 1, y + 1, 24, 12, n > 0.62 ? P.stoneDark : n > 0.28 ? '#302b26' : '#28241f')
      px(ctx, x + 1, y + 1, 24, 1, n > 0.5 ? P.stone : '#3b352e')
      px(ctx, x + 1, y + 12, 24, 1, '#131110')
      if (n > 0.86) px(ctx, x + 5, y + 6, 6, 1, P.stoneDeep)
      if (n < 0.1) px(ctx, x + 16, y + 4, 3, 2, P.stoneDeep)
    }
  }
  // top gloom
  for (let y = 0; y < 34; y++) {
    pxa(ctx, 0, y, PIT.w, 1, '#000000', 0.55 * (1 - y / 34))
  }
  // hanging chains
  for (const cx of [22, 138]) {
    for (let y = 0; y < 30; y += 4) {
      px(ctx, cx, y, 3, 3, y % 8 === 0 ? P.stoneLit : P.stoneDark)
    }
    px(ctx, cx - 2, 30, 7, 3, P.plateDark)
  }
  // scratched tally marks on the wall
  for (let i = 0; i < 7; i++) {
    px(ctx, 108 + i * 3, 52, 1, 9, P.stoneLit)
  }
  pxLine(ctx, 106, 62, 128, 48, P.stoneLit, 1)
}

function drawSandFloor(ctx: Ctx): void {
  px(ctx, 0, PIT.floorY, PIT.w, PIT.h - PIT.floorY, '#453a29')
  // boards edge
  px(ctx, 0, PIT.floorY, PIT.w, 3, P.woodDeep)
  px(ctx, 0, PIT.floorY, PIT.w, 1, P.woodDark)
  // sand speckle
  for (let i = 0; i < 260; i++) {
    const n = noise2(i * 2.3, 13)
    const m = noise2(41, i * 1.7)
    const x = Math.floor(n * PIT.w)
    const y = PIT.floorY + 4 + Math.floor(m * (PIT.h - PIT.floorY - 6))
    const c = n > 0.72 ? '#5a4c35' : n > 0.4 ? '#3d3324' : '#514530'
    px(ctx, x, y, n > 0.9 ? 2 : 1, 1, c)
  }
  // scuffed ring around the dummy
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2
    px(ctx, PIT.dummyX + Math.cos(a) * 30, PIT.dummyY - 4 + Math.sin(a) * 11, 2, 1, '#33291c')
  }
  // scattered straw
  for (let i = 0; i < 22; i++) {
    const n = noise2(i * 5.1, 77)
    const m = noise2(77, i * 3.3)
    px(
      ctx,
      Math.floor(n * PIT.w),
      PIT.floorY + 6 + Math.floor(m * (PIT.h - PIT.floorY - 8)),
      n > 0.5 ? 3 : 2,
      1,
      n > 0.6 ? P.straw : P.strawDark,
    )
  }
}

function drawBrazier(ctx: Ctx, x: number, y: number): void {
  // legs
  px(ctx, x + 2, y + 12, 3, 12, P.plateDark)
  px(ctx, x + 15, y + 12, 3, 12, P.plateDark)
  px(ctx, x + 8, y + 14, 3, 10, P.plateDark)
  px(ctx, x, y + 22, 20, 3, P.plateDeep)
  // bowl
  px(ctx, x, y + 4, 20, 9, P.plateDark)
  px(ctx, x + 2, y + 13, 16, 3, P.plateDeep)
  px(ctx, x, y + 4, 20, 2, P.plateLit)
  outline(ctx, x, y + 4, 20, 9, P.ink, 1)
  // coals
  px(ctx, x + 3, y + 2, 14, 3, P.emberDeep)
  px(ctx, x + 6, y + 2, 8, 1, P.ember)
}

function drawRack(ctx: Ctx, x: number, y: number): void {
  // barrel of practice weapons
  px(ctx, x, y, 16, 20, P.woodDark)
  px(ctx, x, y, 16, 2, P.woodLit)
  px(ctx, x, y + 6, 16, 2, P.plateDark)
  px(ctx, x, y + 15, 16, 2, P.plateDark)
  outline(ctx, x, y, 16, 20, P.ink, 1)
  // shafts poking out
  pxLine(ctx, x + 4, y, x + 1, y - 16, P.woodLit, 2)
  pxLine(ctx, x + 8, y, x + 9, y - 20, P.wood, 2)
  pxLine(ctx, x + 12, y, x + 15, y - 14, P.woodLit, 2)
  px(ctx, x, y - 18, 3, 4, P.stoneLit)
  px(ctx, x + 8, y - 22, 3, 4, P.stoneHi)
}

let pitStatic: HTMLCanvasElement | null = null

function getPitStatic(): HTMLCanvasElement {
  if (pitStatic) return pitStatic
  const cv = document.createElement('canvas')
  cv.width = PIT.w
  cv.height = PIT.h
  const ctx = cv.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  drawBackWall(ctx)
  drawSandFloor(ctx)
  drawBrazier(ctx, 8, 92)
  drawBrazier(ctx, 132, 92)
  drawRack(ctx, 118, 128)
  pitStatic = cv
  return cv
}

/* --------------------------------------------------------------------------
   The dummy itself
   -------------------------------------------------------------------------- */

function drawDummy(ctx: Ctx, lean: number, headSwing: number, wear: number): void {
  const bx = PIT.dummyX
  const by = PIT.dummyY

  // base: sandbag ring
  px(ctx, bx - 14, by - 6, 28, 7, P.strawDark)
  px(ctx, bx - 14, by - 6, 28, 2, P.straw)
  outline(ctx, bx - 14, by - 6, 28, 7, P.ink, 1)
  px(ctx, bx - 9, by - 10, 18, 5, '#4b3d26')
  px(ctx, bx - 9, by - 10, 18, 1, P.strawDark)

  // post, leaning by `lean`
  const topY = by - 74
  const tx = bx + lean
  pxLine(ctx, bx, by - 8, tx, topY, P.woodDark, 7)
  pxLine(ctx, bx - 1, by - 8, tx - 1, topY, P.wood, 3)
  pxLine(ctx, bx + 2, by - 8, tx + 2, topY, P.woodDeep, 2)

  // crossbar arms
  const armY = topY + 18
  const ax = bx + Math.round(lean * 0.78)
  pxLine(ctx, ax - 26, armY + 4, ax + 26, armY - 2, P.woodDark, 5)
  pxLine(ctx, ax - 26, armY + 3, ax + 26, armY - 3, P.wood, 2)
  // rope wrap at the joint
  px(ctx, ax - 4, armY - 2, 9, 7, P.strawDark)
  px(ctx, ax - 4, armY - 2, 9, 2, P.straw)

  // straw torso lashed to the post
  const torsoTop = topY + 22
  for (let y = torsoTop; y < by - 20; y++) {
    const k = (y - torsoTop) / (by - 20 - torsoTop)
    const halfW = Math.round(11 - k * 3)
    const off = Math.round(lean * (1 - k) * 0.8)
    const n = noise2(y, 3)
    px(ctx, bx - halfW + off, y, halfW * 2, 1, n > 0.6 ? P.straw : P.strawDark)
    if (n > 0.8) px(ctx, bx - halfW + off + 2, y, 3, 1, P.strawLit)
    if (n < 0.2) px(ctx, bx + off + 3, y, 4, 1, '#6d5a2f')
  }
  // binding ropes
  for (const ry of [torsoTop + 6, torsoTop + 18, torsoTop + 30]) {
    const off = Math.round(lean * 0.6)
    px(ctx, bx - 11 + off, ry, 22, 3, '#5b4a2c')
    px(ctx, bx - 11 + off, ry, 22, 1, '#7d6738')
  }

  // shoulder pads of leather
  px(ctx, ax - 24, armY - 1, 10, 8, '#4a3524')
  px(ctx, ax + 14, armY - 4, 10, 8, '#4a3524')
  px(ctx, ax - 24, armY - 1, 10, 2, '#63482f')
  px(ctx, ax + 14, armY - 4, 10, 2, '#63482f')

  // battered shield hung on the right arm
  const sx = ax + 16
  const sy = armY + 4
  px(ctx, sx, sy, 16, 20, P.woodDeep)
  px(ctx, sx + 1, sy + 1, 14, 18, '#3a2a1b')
  outline(ctx, sx, sy, 16, 20, P.ink, 1)
  px(ctx, sx + 6, sy + 2, 4, 16, P.plateDark)
  px(ctx, sx + 5, sy + 8, 6, 5, P.plateLit)
  if (wear > 0.5) {
    pxLine(ctx, sx + 2, sy + 3, sx + 13, sy + 15, P.stoneHi, 1)
    pxLine(ctx, sx + 12, sy + 4, sx + 3, sy + 14, '#241a12', 1)
  }

  // head: sack with a helm, swings on a delay
  const hx = bx + Math.round(lean * 1.4) + headSwing
  const hy = topY + 2
  px(ctx, hx - 8, hy, 16, 16, P.straw)
  px(ctx, hx - 8, hy, 16, 2, P.strawLit)
  px(ctx, hx + 6, hy + 2, 2, 13, P.strawDark)
  outline(ctx, hx - 8, hy, 16, 16, '#5c4a22', 1)
  // stitched face
  px(ctx, hx - 5, hy + 6, 3, 2, P.ink)
  px(ctx, hx + 2, hy + 6, 3, 2, P.ink)
  px(ctx, hx - 3, hy + 11, 7, 1, P.ink)
  for (let i = 0; i < 7; i += 2) px(ctx, hx - 3 + i, hy + 10, 1, 3, P.ink)
  // iron helm
  px(ctx, hx - 9, hy - 5, 18, 7, P.plateDark)
  px(ctx, hx - 9, hy - 5, 18, 2, P.plateLit)
  px(ctx, hx - 9, hy + 1, 18, 1, P.ink)
  px(ctx, hx - 2, hy - 8, 4, 4, P.plate)
  px(ctx, hx - 1, hy - 8, 2, 3, P.stoneHi)
  // dents
  if (wear > 0.25) px(ctx, hx + 3, hy - 4, 3, 2, P.plateDeep)
  if (wear > 0.7) px(ctx, hx - 7, hy - 3, 2, 2, P.plateDeep)

  // stray straw poking from the neck
  px(ctx, hx - 6, hy + 15, 2, 3, P.strawLit)
  px(ctx, hx + 3, hy + 15, 2, 4, P.straw)
}

/* --------------------------------------------------------------------------
   Public draw
   -------------------------------------------------------------------------- */

export interface PitOpts {
  t: number
  /** ms since the last hit landed, or a big number if none */
  sinceHit: number
  /** 0..1 how chewed up the dummy looks this round */
  wear: number
  /** current combo, drives the impact ring colour */
  combo: number
  /** true while the round is running */
  active: boolean
}

export function drawPit(ctx: Ctx, o: PitOpts): void {
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(getPitStatic(), 0, 0)

  const flick = 0.85 + Math.sin(o.t / 120) * 0.09 + Math.sin(o.t / 61) * 0.06

  // brazier fire + light
  for (const [x, seed] of [
    [18, 0],
    [142, 1.5],
  ] as [number, number][]) {
    lightPool(ctx, x, 100, 40, P.ember, 0.15 * flick)
    const idx = Math.floor(o.t / 100 + seed * 2) % BRAZIER_FLAME.length
    drawMatrix(ctx, BRAZIER_FLAME[idx]!, x - 2, 88, FIRE_CHARS, seed > 1)
    lightPool(ctx, x, PIT.floorY + 22, 30, P.emberLit, 0.1 * flick)
  }

  // recoil: sharp kick that settles back over ~260ms
  const k = Math.max(0, 1 - o.sinceHit / 260)
  const ease = k * k
  const lean = Math.round(-Math.sin(o.sinceHit / 46) * 7 * ease)
  const headSwing = Math.round(-Math.sin(o.sinceHit / 62) * 5 * ease)

  // dummy shadow
  pxa(ctx, PIT.dummyX - 18, PIT.dummyY - 2, 36, 5, '#000000', 0.4)
  drawDummy(ctx, lean, headSwing, o.wear)

  // impact burst at the point of contact
  if (k > 0.02) {
    const ix = PIT.dummyX + 4
    const iy = PIT.dummyY - 52
    const r = Math.round(6 + (1 - k) * 16)
    const col = o.combo >= 6 ? P.emberLit : o.combo >= 3 ? P.goldLit : P.bone
    const a = k * 0.9
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + 0.4
      pxa(ctx, ix + Math.cos(ang) * r, iy + Math.sin(ang) * r * 0.8, 2, 2, col, a)
    }
    pxa(ctx, ix - 1, iy - 1, 3, 3, P.white, a)
    if (k > 0.6) {
      pxLine(ctx, ix - 10, iy - 8, ix + 10, iy + 8, `rgba(255,255,255,${a * 0.5})`, 2)
      pxLine(ctx, ix + 10, iy - 8, ix - 10, iy + 8, `rgba(255,255,255,${a * 0.5})`, 2)
    }
  }

  // "TAP" hint while idle
  if (!o.active) {
    dither(ctx, 0, 0, PIT.w, PIT.h, '#06040a', 1, 0.4)
  }

  // vignette
  for (let i = 0; i < 4; i++) {
    const a = 0.13 - i * 0.026
    dither(ctx, 0, 0, PIT.w, 3 + i * 3, '#000000', 1, a)
    dither(ctx, 0, PIT.h - (3 + i * 3), PIT.w, 3 + i * 3, '#000000', 1, a)
    dither(ctx, 0, 0, 3 + i * 3, PIT.h, '#000000', 1, a)
    dither(ctx, PIT.w - (3 + i * 3), 0, 3 + i * 3, PIT.h, '#000000', 1, a)
  }
}
