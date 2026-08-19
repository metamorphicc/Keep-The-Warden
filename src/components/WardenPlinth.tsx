import { useEffect, useRef } from 'react'
import { getState } from '../game/store'
import { dither, px, pxa, type Ctx } from '../render/draw'
import { drawWardenPortrait } from '../render/warden'
import { P } from '../styles/palette'

/* ==========================================================================
   The warden, standing in a lit alcove. Used by the Regalia screen and the
   service record. Draws at native pixel size and lets CSS do the upscale, so
   the sprite stays crisp at any panel width.
   ========================================================================== */

export interface WardenPlinthProps {
  /** pixel width of the backing buffer */
  width?: number
  /** pixel height of the backing buffer */
  height?: number
  className?: string
}

export function WardenPlinth({
  width = 132,
  height = 96,
  className = 'plinth__canvas',
}: WardenPlinthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = width
    canvas.height = height
    ctx.imageSmoothingEnabled = false

    let raf = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // read live so equipping a piece shows up on the very next frame
      const s = getState()
      const t = s.settings.reduceMotion ? 1200 : now
      drawAlcove(ctx, width, height, t)
      drawWardenPortrait(ctx, width / 2, height - 8, s.look, t, s.needs)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [width, height])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}

/** Panelled back wall, stone step, and two candles for rim light. */
function drawAlcove(ctx: Ctx, w: number, h: number, t: number): void {
  px(ctx, 0, 0, w, h, '#0e0a07')

  for (let x = 0; x < w; x += 14) {
    px(ctx, x, 0, 13, h - 12, x % 28 === 0 ? '#1a1109' : '#160e08')
    px(ctx, x + 13, 0, 1, h - 12, '#0a0604')
  }

  px(ctx, 0, h - 12, w, 12, P.stoneDark)
  px(ctx, 0, h - 12, w, 2, P.stoneLit)
  px(ctx, 0, h - 3, w, 3, '#181512')
  for (let x = 6; x < w; x += 26) px(ctx, x, h - 10, 1, 7, P.stoneDeep)

  const flame = 4 + (Math.floor(t / 130) % 3)
  for (const cx of [10, w - 14]) {
    px(ctx, cx, h - 26, 5, 14, P.boneDim)
    px(ctx, cx, h - 26, 5, 2, P.bone)
    pxa(ctx, cx + 1, h - 26 - flame, 3, flame, P.emberLit, 0.95)
    pxa(ctx, cx - 8, h - 44, 20, 28, P.ember, 0.06)
  }

  dither(ctx, 0, 0, w, 12, '#000000', 1, 0.4)
  dither(ctx, 0, 0, 6, h, '#000000', 1, 0.2)
  dither(ctx, w - 6, 0, 6, h, '#000000', 1, 0.2)
}
