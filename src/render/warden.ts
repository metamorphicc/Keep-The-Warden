import { P } from '../styles/palette'
import { noise2, px, pxa, pxLine, type Ctx } from './draw'
import type { ActivityKind, EquippedLook, Stats } from '../game/types'

/* ==========================================================================
   Old Halvard — an original elderly pixel trader who used to guard a door.
   Built from primitives instead of a sprite sheet so every pose, every
   equipment variant and every "fried / cooked / annoyed" state is one set of
   numbers away. Origin is the point between his boots.

   Body plan (px above the feet):
     60 head top | 47 chin | 44 shoulders | 29 waist | 17 skirt | 8 knee | 0 sole
   ========================================================================== */

export const HERO_H = 60
export const HERO_W = 36

export interface Pose {
  /** whole-body vertical offset (breathing, hops) */
  bob: number
  /** whole-body horizontal offset (walking to the mat, lunging) */
  shift: number
  /** torso lean, positive = forward/right */
  lean: number
  /** folds the legs and drops the torso (sleeping) */
  sit: number
  headTilt: number
  headDrop: number
  eyes: 'open' | 'closed' | 'tired' | 'angry' | 'wide'
  mouth: 'flat' | 'open' | 'grin'
  /** hand positions relative to the shoulder */
  armL: { x: number; y: number }
  armR: { x: number; y: number }
  /** blade angles in radians, measured from the hand */
  swordL: number
  swordR: number
  swordLen: number
  bladesUp: boolean
  capeSway: number
  /** 0..1 strength of the edge aura */
  aura: number
  /** 0..2 grime — sweat and printer soot, i.e. Heat */
  dirt: number
  /** prop held in the left hand */
  prop: 'none' | 'ledger' | 'slate' | 'chips'
  /** walking legs (0 = still) */
  step: number
  /** flash frame on the blades */
  flash: number
}

const D = Math.PI / 180

function basePose(): Pose {
  return {
    bob: 0,
    shift: 0,
    lean: 0,
    sit: 0,
    headTilt: 0,
    headDrop: 0,
    eyes: 'open',
    mouth: 'flat',
    armL: { x: -8, y: 14 },
    armR: { x: 8, y: 14 },
    swordL: 118 * D,
    swordR: 62 * D,
    swordLen: 22,
    bladesUp: false,
    capeSway: 0,
    aura: 0.5,
    dirt: 0,
    prop: 'none',
    step: 0,
    flash: 0,
  }
}

/* --------------------------------------------------------------------------
   Pose selection
   -------------------------------------------------------------------------- */

export interface PoseInput {
  activity: ActivityKind
  /** 0..1 through the current activity */
  phase: number
  t: number
  stats: Stats
}

export function poseFor({ activity, phase, t, stats }: PoseInput): Pose {
  const p = basePose()

  const breathe = Math.sin(t / 620)
  p.bob = breathe > 0.5 ? -1 : 0
  p.capeSway = Math.sin(t / 900) * 1.5
  // A sharp thesis glows. A cooked one sweats.
  p.aura = Math.max(0.08, stats.edge / 100)
  p.dirt = stats.heat > 82 ? 2 : stats.heat > 58 ? 1 : 0

  // baseline demeanour from the stats
  if (stats.focus < 26) {
    p.eyes = 'tired'
    p.headDrop = 2
    p.bob = breathe > 0.5 ? 0 : 1
  }
  if (stats.heat > 74) {
    p.eyes = 'angry'
    p.mouth = 'flat'
    p.headTilt = -1
  }
  if (stats.edge < 26) {
    p.lean = -1
  }
  // blink
  if (p.eyes === 'open' && (t / 1000) % 5.4 < 0.16) p.eyes = 'closed'

  switch (activity) {
    case 'pnl': {
      // quick flourish: probes snap up, head lifts, sparks off the book
      const k = Math.sin(phase * Math.PI)
      p.bladesUp = true
      p.swordL = (118 - 92 * k) * D
      p.swordR = (62 + 92 * k) * D
      p.armL = { x: -9 - k * 2, y: 14 - k * 10 }
      p.armR = { x: 9 + k * 2, y: 14 - k * 10 }
      p.headDrop = -1
      p.eyes = phase < 0.5 ? 'wide' : 'open'
      p.mouth = 'grin'
      p.flash = phase < 0.45 ? 1 : 0
      p.aura = Math.min(1, p.aura + 0.4 * k)
      break
    }

    case 'research': {
      const scan = Math.sin(phase * Math.PI * 3)
      p.prop = 'ledger'
      p.armL = { x: -10, y: 12 }
      p.armR = { x: 4, y: 6 + scan * 3 }
      p.swordR = 62 * D
      p.headDrop = 1 + (scan > 0 ? 1 : 0)
      p.mouth = scan > 0.3 ? 'open' : 'flat'
      p.eyes = 'open'
      p.swordLen = 0 // probes down while he reads
      break
    }

    case 'recover': {
      // shuffle over to the cot, fold up, snore
      const walkIn = Math.min(1, phase / 0.14)
      const walkOut = phase > 0.86 ? (phase - 0.86) / 0.14 : 0
      const settle = Math.min(1, Math.max(0, (phase - 0.14) / 0.1))
      const travel = -62
      p.shift = travel * (walkIn - walkOut)
      p.step = phase < 0.14 || phase > 0.86 ? Math.floor(t / 110) % 2 : 0
      p.sit = settle - walkOut
      p.eyes = 'closed'
      p.headDrop = 3 * p.sit
      p.headTilt = -2 * p.sit
      p.armL = { x: -7, y: 16 }
      p.armR = { x: 7, y: 16 }
      p.swordLen = p.sit > 0.5 ? 0 : 22
      p.bob = Math.sin(t / 700) > 0 ? 0 : 1
      p.aura = Math.max(0.1, p.aura * 0.55)
      break
    }

    case 'hedge': {
      const work = Math.sin(phase * Math.PI * 7)
      p.prop = 'slate'
      p.armL = { x: -4 + work * 4, y: 8 + Math.abs(work) * 2 }
      p.armR = { x: 9, y: 15 }
      p.swordLen = 0
      p.headDrop = 1
      p.eyes = 'closed'
      p.mouth = 'flat'
      break
    }

    case 'scan': {
      const hop = Math.sin(phase * Math.PI * 3)
      p.bob = -Math.round(Math.abs(hop) * 3)
      p.bladesUp = true
      const spin = phase * Math.PI * 4
      p.swordL = spin + 90 * D
      p.swordR = -spin + 90 * D
      p.armL = { x: -10, y: 6 }
      p.armR = { x: 10, y: 6 }
      p.mouth = 'grin'
      p.eyes = 'open'
      p.flash = Math.floor(phase * 8) % 2
      break
    }

    case 'bet': {
      // wind up, then commit
      const k = phase < 0.4 ? -phase / 0.4 : (phase - 0.4) / 0.6
      p.lean = Math.round(k * 4)
      p.shift = Math.round(k * 3)
      p.bladesUp = true
      p.swordR = (62 - 55 * k) * D
      p.swordL = (118 + 20 * k) * D
      p.armR = { x: 8 + k * 6, y: 12 - k * 4 }
      p.armL = { x: -8, y: 14 }
      p.eyes = 'angry'
      p.mouth = 'open'
      p.flash = k > 0.6 ? 1 : 0
      break
    }

    case 'refuse': {
      const shake = Math.sin(phase * Math.PI * 6)
      p.shift = Math.round(shake * 2)
      p.headTilt = Math.round(shake * 2)
      p.eyes = 'angry'
      p.mouth = 'flat'
      p.armL = { x: -11, y: 10 }
      p.armR = { x: 11, y: 10 }
      break
    }

    case 'idle':
    default: {
      // slow idle sway; occasionally shifts weight
      const cycle = (t / 3400) % 1
      if (cycle > 0.82) {
        p.lean = 1
        p.armR = { x: 9, y: 13 }
      }
      break
    }
  }

  return p
}

/* --------------------------------------------------------------------------
   Equipment colour resolution
   -------------------------------------------------------------------------- */

interface Kit {
  cloak: { dark: string; mid: string; lit: string; ragged: boolean; fur: boolean }
  blade: { core: string; edge: string; glow: string | null; glowMul: number }
  head: 'bare' | 'circlet' | 'antler' | 'crown'
}

function kitFor(look: EquippedLook): Kit {
  const cloakId = look.cloak
  const cloak =
    cloakId === 'cloak_watch'
      ? { dark: P.tealDeep, mid: P.teal, lit: P.tealLit, ragged: false, fur: false }
      : cloakId === 'cloak_pelt'
        ? { dark: P.boneDeep, mid: P.boneDim, lit: P.bone, ragged: false, fur: true }
        : cloakId === 'cloak_ember'
          ? { dark: P.emberDeep, mid: P.ember, lit: P.emberLit, ragged: false, fur: false }
          : cloakId === 'cloak_rag'
            ? { dark: '#2a211a', mid: '#3d3026', lit: '#4f3f31', ragged: true, fur: false }
            : { dark: '#241d18', mid: '#2e251d', lit: '#3a2e24', ragged: true, fur: false }

  const bladeId = look.blade
  const blade =
    bladeId === 'blade_spirit'
      ? { core: P.spiritLit, edge: P.spiritPale, glow: P.spirit, glowMul: 1 }
      : bladeId === 'blade_ember'
        ? { core: P.emberLit, edge: P.emberPale, glow: P.ember, glowMul: 1 }
        : // plain steel, but his own spirit still runs down the fullers
          { core: P.stoneHi, edge: P.bone, glow: P.spirit, glowMul: 0.42 }

  const head =
    look.head === 'head_circlet'
      ? 'circlet'
      : look.head === 'head_antler'
        ? 'antler'
        : look.head === 'head_crown'
          ? 'crown'
          : 'bare'

  return { cloak, blade, head }
}

/* --------------------------------------------------------------------------
   Parts
   -------------------------------------------------------------------------- */

function drawCape(ctx: Ctx, cx: number, groundY: number, pose: Pose, kit: Kit): void {
  const top = groundY - 46 + pose.bob + Math.round(pose.sit * 12)
  const bottom = groundY - 4 - Math.round(pose.sit * 10)
  const sway = pose.capeSway + pose.lean * -0.6
  const { dark, mid, lit, ragged, fur } = kit.cloak

  for (let y = top; y < bottom; y++) {
    const k = (y - top) / Math.max(1, bottom - top)
    const halfW = 9 + k * 5
    const off = Math.round(sway * k * 2)
    const x0 = cx - halfW + off
    const w = halfW * 2
    px(ctx, x0, y, w, 1, k < 0.18 ? lit : k < 0.6 ? mid : dark)
    // inner shadow where the body blocks the light
    px(ctx, cx - 5 + off, y, 10, 1, dark)
    if (fur && y % 3 === 0) {
      px(ctx, x0 - 1, y, 2, 1, lit)
      px(ctx, x0 + w - 1, y, 2, 1, lit)
    }
  }
  // ragged hem
  if (ragged) {
    for (let i = 0; i < 7; i++) {
      const n = noise2(i, 3)
      if (n > 0.45) {
        const w = 3
        px(ctx, cx - 12 + i * 4 + Math.round(sway * 2), bottom, w, 1 + Math.floor(n * 3), dark)
      }
    }
  } else {
    px(ctx, cx - 14 + Math.round(sway * 2), bottom, 28, 2, dark)
  }
  // clasp
  px(ctx, cx - 8, top + 1, 16, 2, P.goldDark)
  px(ctx, cx - 2, top, 4, 3, P.gold)
}

function drawLegs(ctx: Ctx, cx: number, groundY: number, pose: Pose): void {
  if (pose.sit > 0.5) {
    // folded, sitting on the straw
    const y = groundY - 8
    px(ctx, cx - 14, y, 12, 6, P.plateDark)
    px(ctx, cx + 2, y, 12, 6, P.plateDark)
    px(ctx, cx - 14, y, 12, 2, P.plate)
    px(ctx, cx + 2, y, 12, 2, P.plate)
    px(ctx, cx - 16, y + 2, 4, 4, P.woodDark)
    px(ctx, cx + 12, y + 2, 4, 4, P.woodDark)
    return
  }

  const stepOff = pose.step ? 2 : 0
  for (const side of [-1, 1] as const) {
    const lx = cx + (side < 0 ? -9 : 1)
    const lift = pose.step && side < 0 ? stepOff : 0
    // greave
    px(ctx, lx, groundY - 19 - lift, 8, 12, P.plateDark)
    px(ctx, lx, groundY - 19 - lift, 8, 2, P.plate)
    px(ctx, lx + (side < 0 ? 0 : 7), groundY - 19 - lift, 1, 12, P.plateLit)
    // knee trim
    px(ctx, lx, groundY - 14 - lift, 8, 2, P.goldDark)
    px(ctx, lx + 2, groundY - 14 - lift, 4, 1, P.gold)
    // boot
    px(ctx, lx - 1, groundY - 8 - lift, 10, 8, P.woodDeep)
    px(ctx, lx - 1, groundY - 8 - lift, 10, 2, P.woodDark)
    px(ctx, lx - 1, groundY - 2 - lift, 10, 2, P.ink)
    px(ctx, lx, groundY - 6 - lift, 2, 4, '#3a2a1c')
  }
}

function drawTorso(ctx: Ctx, cx: number, groundY: number, pose: Pose, kit: Kit): void {
  const lean = pose.lean
  const drop = Math.round(pose.sit * 12)
  const top = groundY - 44 + pose.bob + drop
  const waist = groundY - 29 + drop

  // armoured skirt
  px(ctx, cx - 12, waist - 1, 24, 12 - Math.round(pose.sit * 4), P.plateDeep)
  for (let i = 0; i < 6; i++) {
    px(ctx, cx - 12 + i * 4, waist, 3, 10 - Math.round(pose.sit * 4), i % 2 ? P.plateDark : P.plateDeep)
  }
  px(ctx, cx - 12, waist - 1, 24, 2, P.plate)

  // belt
  px(ctx, cx - 11 + lean, waist - 4, 22, 4, P.woodDark)
  px(ctx, cx - 11 + lean, waist - 4, 22, 1, P.wood)
  px(ctx, cx - 3 + lean, waist - 5, 6, 6, P.goldDark)
  px(ctx, cx - 2 + lean, waist - 4, 4, 4, P.gold)

  // chest plate
  px(ctx, cx - 10 + lean, top, 20, waist - top - 3, P.plateDark)
  px(ctx, cx - 10 + lean, top, 20, 2, P.plate)
  px(ctx, cx - 10 + lean, top, 2, waist - top - 3, P.plate)
  px(ctx, cx + 8 + lean, top, 2, waist - top - 3, P.plateDeep)
  // gold trim down the middle
  px(ctx, cx - 1 + lean, top + 2, 2, waist - top - 6, P.goldDark)
  // collar
  px(ctx, cx - 8 + lean, top - 1, 16, 2, P.goldDark)
  px(ctx, cx - 5 + lean, top - 1, 10, 1, P.gold)

  // spirit rune on the chest
  const runeY = top + 5
  const glow = pose.aura
  pxa(ctx, cx - 4 + lean, runeY - 1, 8, 8, P.spirit, 0.18 * glow)
  px(ctx, cx - 1 + lean, runeY, 2, 6, kit.blade.glow ?? P.spirit)
  px(ctx, cx - 4 + lean, runeY + 2, 8, 2, kit.blade.glow ?? P.spirit)
  pxa(ctx, cx - 1 + lean, runeY + 1, 2, 2, P.spiritPale, 0.9 * glow)

  // pauldrons
  for (const side of [-1, 1] as const) {
    const sx = side < 0 ? cx - 17 + lean : cx + 9 + lean
    px(ctx, sx, top - 2, 8, 7, P.plateDark)
    px(ctx, sx, top - 2, 8, 2, P.plateLit)
    px(ctx, sx, top + 4, 8, 2, P.goldDark)
    px(ctx, sx + (side < 0 ? 0 : 6), top - 1, 2, 6, P.plate)
    // spike
    px(ctx, sx + (side < 0 ? 0 : 6), top - 4, 2, 3, P.stoneHi)
  }
}

function drawArm(
  ctx: Ctx,
  shoulderX: number,
  shoulderY: number,
  hand: { x: number; y: number },
): { hx: number; hy: number } {
  const hx = shoulderX + hand.x
  const hy = shoulderY + hand.y
  const ex = shoulderX + Math.round(hand.x * 0.62)
  const ey = shoulderY + Math.round(hand.y * 0.55)
  // upper arm + forearm
  pxLine(ctx, shoulderX, shoulderY, ex, ey, P.plateDark, 4)
  pxLine(ctx, ex, ey, hx, hy, P.plateDark, 3)
  pxLine(ctx, shoulderX, shoulderY, ex, ey, P.plate, 2)
  // elbow guard
  px(ctx, ex - 2, ey - 1, 4, 3, P.goldDark)
  // gauntlet
  px(ctx, hx - 2, hy - 2, 5, 5, P.plate)
  px(ctx, hx - 2, hy - 2, 5, 1, P.plateLit)
  px(ctx, hx - 2, hy + 2, 5, 1, P.ink)
  return { hx, hy }
}

function drawBlade(
  ctx: Ctx,
  hx: number,
  hy: number,
  angle: number,
  len: number,
  kit: Kit,
  flash: number,
  aura: number,
): void {
  if (len <= 0) return
  const probeLen = Math.min(len, 16)
  const ex = hx + Math.cos(angle) * probeLen
  const ey = hy - Math.sin(angle) * probeLen

  // grip + cable plug behind the hand
  const gx = hx - Math.cos(angle) * 4
  const gy = hy + Math.sin(angle) * 4
  pxLine(ctx, hx, hy, gx, gy, P.woodDark, 3)
  px(ctx, Math.round(gx) - 1, Math.round(gy) - 1, 3, 3, P.plateDark)

  // glow halo
  if (kit.blade.glow) {
    const prev = ctx.globalAlpha
    const gm = kit.blade.glowMul
    ctx.globalAlpha = prev * (0.15 + 0.22 * aura) * gm
    pxLine(ctx, hx, hy, ex, ey, kit.blade.glow, 4)
    ctx.globalAlpha = prev * (0.35 + 0.3 * aura) * gm
    pxLine(ctx, hx, hy, ex, ey, kit.blade.glow, 2)
    ctx.globalAlpha = prev
  }

  // blunt signal probe body + lit tip
  pxLine(ctx, hx, hy, ex, ey, kit.blade.core, 2)
  pxLine(ctx, hx, hy, ex, ey, kit.blade.edge, 1)
  px(ctx, Math.round(ex) - 1, Math.round(ey) - 1, 3, 3, kit.blade.glow ?? kit.blade.edge)
  px(ctx, Math.round(ex), Math.round(ey), 1, 1, kit.blade.edge)

  if (flash > 0) {
    const prev = ctx.globalAlpha
    ctx.globalAlpha = prev * 0.85
    px(ctx, Math.round(ex) - 2, Math.round(ey) - 2, 5, 5, '#ffffff')
    ctx.globalAlpha = prev
  }
}

function drawHead(ctx: Ctx, cx: number, groundY: number, pose: Pose, kit: Kit): void {
  const drop = Math.round(pose.sit * 12) + pose.headDrop
  const tilt = pose.headTilt
  const top = groundY - 60 + pose.bob + drop
  const hx = cx + tilt + Math.round(pose.lean * 0.5)

  // neck
  px(ctx, cx - 4 + pose.lean, top + 12, 8, 4, P.skinShade)

  // skull + face
  px(ctx, hx - 7, top + 1, 14, 13, P.skin)
  px(ctx, hx - 7, top + 1, 14, 2, P.skinLit)
  px(ctx, hx - 7, top + 1, 2, 12, P.skinLit)
  px(ctx, hx + 5, top + 2, 2, 12, P.skinShade)
  // temples / crow's feet
  px(ctx, hx - 6, top + 6, 2, 1, P.skinShade)
  px(ctx, hx + 4, top + 6, 2, 1, P.skinShade)

  // white hair at the back and sides
  px(ctx, hx - 8, top, 16, 3, P.boneDim)
  px(ctx, hx - 8, top, 16, 1, P.bone)
  px(ctx, hx - 9, top + 2, 2, 6, P.boneDim)
  px(ctx, hx + 7, top + 2, 2, 6, P.boneDim)

  // heavy brows
  const browY = top + 5
  px(ctx, hx - 6, browY, 5, 2, P.bone)
  px(ctx, hx + 1, browY, 5, 2, P.bone)
  if (pose.eyes === 'angry') {
    px(ctx, hx - 6, browY + 1, 5, 1, P.boneDim)
    px(ctx, hx - 2, browY + 2, 2, 1, P.bone)
    px(ctx, hx, browY + 2, 2, 1, P.bone)
  }

  // eyes
  const eyeY = top + 7
  const drawEye = (ox: number) => {
    switch (pose.eyes) {
      case 'closed':
        px(ctx, hx + ox, eyeY + 1, 3, 1, P.skinShade)
        break
      case 'tired':
        px(ctx, hx + ox, eyeY, 3, 1, P.skinShade)
        px(ctx, hx + ox + 1, eyeY + 1, 1, 1, P.ink)
        break
      case 'wide':
        px(ctx, hx + ox - 1, eyeY - 1, 4, 4, P.bone)
        px(ctx, hx + ox, eyeY, 2, 2, P.spirit)
        break
      case 'angry':
        px(ctx, hx + ox, eyeY, 3, 2, P.bone)
        px(ctx, hx + ox + (ox < 0 ? 1 : 0), eyeY + 1, 2, 1, P.ink)
        break
      default:
        px(ctx, hx + ox, eyeY, 3, 2, P.bone)
        px(ctx, hx + ox + 1, eyeY, 1, 2, P.ink)
        // faint spirit shine in the pupil
        pxa(ctx, hx + ox + 1, eyeY, 1, 1, P.spiritLit, 0.5)
    }
  }
  drawEye(-5)
  drawEye(3)

  // nose
  px(ctx, hx - 1, eyeY + 2, 2, 3, P.skinShade)
  px(ctx, hx - 1, eyeY + 4, 3, 1, P.skinShade)

  // scar across the left brow
  px(ctx, hx - 6, top + 3, 1, 4, P.skinShade)

  // moustache + beard
  const beardTop = top + 11
  px(ctx, hx - 6, beardTop - 1, 12, 3, P.bone)
  const beardBottom = beardTop + 18 - Math.round(pose.sit * 4)
  for (let y = beardTop + 2; y < beardBottom; y++) {
    const k = (y - beardTop) / (beardBottom - beardTop)
    const halfW = Math.max(2, Math.round(7 - k * 4))
    const wob = Math.round(Math.sin(y * 1.7) * 0.6)
    px(ctx, hx - halfW + wob, y, halfW * 2, 1, k > 0.55 ? P.boneDim : P.bone)
    px(ctx, hx - halfW + wob, y, 1, 1, P.bone)
    if (y % 5 === 0) px(ctx, hx - halfW + 2 + wob, y, halfW, 1, P.boneDeep)
  }
  // mouth peeking through the moustache
  if (pose.mouth === 'open') px(ctx, hx - 2, beardTop + 2, 4, 2, '#3a1f16')
  else if (pose.mouth === 'grin') px(ctx, hx - 3, beardTop + 2, 6, 1, '#3a1f16')

  // headgear
  switch (kit.head) {
    case 'circlet':
      px(ctx, hx - 8, top + 1, 16, 3, P.plateDark)
      px(ctx, hx - 8, top + 1, 16, 1, P.plateLit)
      px(ctx, hx - 2, top, 4, 4, P.plate)
      px(ctx, hx - 1, top + 1, 2, 2, P.spiritLit)
      break
    case 'antler':
      px(ctx, hx - 8, top, 16, 4, P.plateDark)
      px(ctx, hx - 8, top, 16, 1, P.plateLit)
      pxLine(ctx, hx - 7, top, hx - 11, top - 8, P.boneDim, 2)
      pxLine(ctx, hx - 11, top - 8, hx - 14, top - 6, P.boneDim, 1)
      pxLine(ctx, hx - 10, top - 5, hx - 13, top - 3, P.boneDim, 1)
      pxLine(ctx, hx + 7, top, hx + 11, top - 8, P.boneDim, 2)
      pxLine(ctx, hx + 11, top - 8, hx + 14, top - 6, P.boneDim, 1)
      pxLine(ctx, hx + 10, top - 5, hx + 13, top - 3, P.boneDim, 1)
      break
    case 'crown':
      px(ctx, hx - 8, top, 16, 4, P.gold)
      px(ctx, hx - 8, top + 3, 16, 1, P.goldDark)
      for (let i = 0; i < 4; i++) {
        px(ctx, hx - 7 + i * 5, top - 3, 2, 3, P.goldLit)
      }
      px(ctx, hx - 1, top + 1, 3, 2, P.blood)
      break
    default:
      // bald crown with a few stubborn strands
      px(ctx, hx - 5, top, 10, 2, P.boneDim)
      px(ctx, hx - 2, top - 1, 2, 2, P.bone)
      break
  }

  // grime on the face
  if (pose.dirt > 0) {
    pxa(ctx, hx + 2, top + 9, 3, 2, '#4a3520', 0.6)
    if (pose.dirt > 1) pxa(ctx, hx - 6, top + 8, 3, 2, '#4a3520', 0.55)
  }
}

function drawProp(ctx: Ctx, hx: number, hy: number, pose: Pose): void {
  switch (pose.prop) {
    case 'ledger':
      // a small open book: bone pages, a wooden spine, one red line
      px(ctx, hx - 5, hy - 3, 11, 6, P.woodDark)
      px(ctx, hx - 4, hy - 2, 4, 4, P.bone)
      px(ctx, hx + 1, hy - 2, 4, 4, P.boneDim)
      px(ctx, hx, hy - 3, 1, 6, P.ink)
      px(ctx, hx - 3, hy, 2, 1, P.bloodLit)
      break
    case 'slate':
      // a wax slate and a stylus, teal chalk dust coming off it
      px(ctx, hx - 3, hy - 2, 7, 3, P.wood)
      px(ctx, hx - 3, hy - 2, 7, 1, P.woodLit)
      for (let i = 0; i < 7; i += 2) px(ctx, hx - 3 + i, hy + 1, 1, 3, P.boneDim)
      pxa(ctx, hx - 5, hy - 5, 3, 3, P.tealLit, 0.7)
      pxa(ctx, hx + 3, hy - 7, 2, 2, P.tealLit, 0.6)
      break
    case 'chips':
      // two market tokens, pip up
      px(ctx, hx - 4, hy - 3, 4, 4, P.bone)
      px(ctx, hx - 3, hy - 2, 1, 1, P.ink)
      px(ctx, hx + 1, hy - 1, 4, 4, P.bone)
      px(ctx, hx + 2, hy, 1, 1, P.ink)
      break
    default:
      break
  }
}

function drawAura(ctx: Ctx, cx: number, groundY: number, pose: Pose, t: number): void {
  const level = pose.aura
  if (level <= 0.05) return
  const count = 3 + Math.round(level * 4)
  for (let i = 0; i < count; i++) {
    const ph = t / 900 + (i * Math.PI * 2) / count
    const r = 15 + Math.sin(ph * 1.7 + i) * 4
    const x = cx + Math.cos(ph) * r
    const y = groundY - 30 + Math.sin(ph * 1.3) * 14
    const a = (0.3 + 0.4 * Math.sin(ph * 2.1)) * level
    pxa(ctx, x, y, 2, 2, P.spiritLit, Math.max(0, a))
    if (a > 0.4) pxa(ctx, x, y, 1, 1, P.spiritPale, a)
  }
  // ground shimmer
  pxa(ctx, cx - 14, groundY - 3, 28, 2, P.spirit, 0.1 * level)
}

/* --------------------------------------------------------------------------
   Public
   -------------------------------------------------------------------------- */

export function drawWarden(
  ctx: Ctx,
  originX: number,
  groundY: number,
  pose: Pose,
  look: EquippedLook,
  t: number,
): void {
  const kit = kitFor(look)
  const cx = Math.round(originX + pose.shift)
  const gy = Math.round(groundY + (pose.sit > 0.5 ? 2 : 0))

  drawAura(ctx, cx, gy, pose, t)
  drawCape(ctx, cx, gy, pose, kit)
  drawLegs(ctx, cx, gy, pose)
  drawTorso(ctx, cx, gy, pose, kit)

  const shoulderY = gy - 41 + pose.bob + Math.round(pose.sit * 12)

  // back arm + blade first so they sit behind the torso
  const back = drawArm(ctx, cx - 8 + pose.lean, shoulderY, pose.armL)
  drawBlade(ctx, back.hx, back.hy, pose.swordL, pose.swordLen, kit, pose.flash, pose.aura)
  drawProp(ctx, back.hx, back.hy, pose)

  drawHead(ctx, cx, gy, pose, kit)

  // front arm + blade on top
  const front = drawArm(ctx, cx + 8 + pose.lean, shoulderY, pose.armR)
  drawBlade(ctx, front.hx, front.hy, pose.swordR, pose.swordLen, kit, pose.flash, pose.aura)

  // grime streaks on the armour
  if (pose.dirt > 0) {
    const a = pose.dirt > 1 ? 0.5 : 0.3
    pxa(ctx, cx - 8, gy - 36, 5, 3, '#4a3520', a)
    pxa(ctx, cx + 2, gy - 24, 6, 2, '#4a3520', a)
    pxa(ctx, cx - 6, gy - 12, 4, 2, '#4a3520', a)
    if (pose.dirt > 1) {
      pxa(ctx, cx + 4, gy - 40, 4, 2, '#4a3520', a)
      pxa(ctx, cx - 12, gy - 20, 3, 3, '#4a3520', a)
    }
  }

  // sleep marks
  if (pose.eyes === 'closed' && pose.sit > 0.5) {
    const zt = (t / 700) % 3
    for (let i = 0; i < 3; i++) {
      const k = (zt + i) % 3
      const a = 1 - k / 3
      const size = 2 + i
      pxa(ctx, cx + 12 + k * 4, gy - 38 - k * 7, size, size, P.bone, a * 0.8)
    }
  }
}

/** Portrait version for the rig preview: same sprite, static idle pose. */
export function drawWardenPortrait(
  ctx: Ctx,
  cx: number,
  groundY: number,
  look: EquippedLook,
  t: number,
  stats: Stats,
): void {
  const pose = poseFor({ activity: 'idle', phase: 0, t, stats })
  pose.bladesUp = true
  pose.swordL = 130 * D
  pose.swordR = 50 * D
  drawWarden(ctx, cx, groundY, pose, look, t)
}
