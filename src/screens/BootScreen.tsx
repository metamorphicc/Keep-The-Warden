import { useEffect, useRef, useState } from 'react'
import { PixelButton } from '../components/PixelButton'
import { PixelIcon } from '../components/PixelIcon'
import { Ribbon } from '../components/Ribbon'
import { enterHall } from '../game/actions'
import { GAME_VERSION, WORLD } from '../game/config'
import { bootLine } from '../game/copy'
import { useGame } from '../game/store'
import { unlockAudio } from '../game/sound'
import { formatAway } from '../game/util'
import { P } from '../styles/palette'
import { px, pxa, pxLine, dither, type Ctx } from '../render/draw'
import { drawWardenPortrait } from '../render/warden'

/* ==========================================================================
   Boot / title screen. Also the audio unlock gesture — the browser will not
   let us make a sound until the player touches something.
   ========================================================================== */

const TITLE_W = 132
const TITLE_H = 116

export function BootScreen() {
  const { look, stats, awayMs, visits } = useGame((s) => ({
    look: s.look,
    stats: s.stats,
    awayMs: s.awayMs,
    visits: s.visits,
  }))
  const [line] = useState(() => bootLine())
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = TITLE_W
    canvas.height = TITLE_H
    ctx.imageSmoothingEnabled = false

    let raf = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      drawPlinth(ctx, now)
      drawWardenPortrait(ctx, TITLE_W / 2, TITLE_H - 12, look, now, stats)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [look, stats])

  const begin = () => {
    unlockAudio()
    enterHall()
  }

  return (
    <div className="boot">
      <div className="boot__vignette" aria-hidden="true" />

      <div className="boot__top">
        <p className="t-label t-dim boot__eyebrow">{WORLD.subtitle}</p>
        <h1 className="boot__title t-shadow">
          <span>Quantum</span>
          <span className="boot__title-small">— sim —</span>
          <span>Pit</span>
        </h1>
        <div className="boot__rule">
          <span />
          <PixelIcon name="swordBlue" size={14} />
          <span />
        </div>
      </div>

      <canvas ref={canvasRef} className="boot__art" aria-hidden="true" />

      <div className="boot__bottom">
        <p className="t-body t-center boot__line">{line}</p>

        <PixelButton
          label={visits > 1 ? 'Back to the Desk' : 'Take the Desk'}
          icon="torch"
          variant="gold"
          size="lg"
          full
          onClick={begin}
        />

        {visits > 1 && awayMs > 60_000 ? (
          <div className="boot__away">
            <Ribbon tone="dark" size="sm">{`Away ${formatAway(awayMs)}`}</Ribbon>
          </div>
        ) : null}

        <p className="t-label boot__version">
          v{GAME_VERSION} · {WORLD.disclaimer}
        </p>
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   A small stone plinth with two braziers, drawn behind the portrait.
   -------------------------------------------------------------------------- */

function drawPlinth(ctx: Ctx, t: number): void {
  px(ctx, 0, 0, TITLE_W, TITLE_H, '#0c0806')

  // back arch
  px(ctx, 30, 6, 72, TITLE_H - 22, '#140d09')
  px(ctx, 34, 10, 64, TITLE_H - 26, '#1a110b')
  for (let y = 10; y < TITLE_H - 16; y += 12) {
    px(ctx, 34, y, 64, 1, '#241609')
  }

  // floor
  px(ctx, 0, TITLE_H - 14, TITLE_W, 14, P.stoneDark)
  px(ctx, 0, TITLE_H - 14, TITLE_W, 2, P.stoneLit)
  for (let x = 0; x < TITLE_W; x += 22) {
    px(ctx, x, TITLE_H - 12, 1, 12, P.stoneDeep)
  }

  const flick = 0.8 + Math.sin(t / 120) * 0.12 + Math.sin(t / 53) * 0.08

  // braziers
  for (const bx of [12, TITLE_W - 26]) {
    px(ctx, bx + 4, TITLE_H - 30, 6, 18, P.plateDark)
    px(ctx, bx, TITLE_H - 38, 14, 8, P.plateDark)
    px(ctx, bx, TITLE_H - 38, 14, 2, P.plateLit)
    const h = 5 + (Math.floor(t / 100) % 3)
    pxa(ctx, bx + 3, TITLE_H - 38 - h, 8, h, P.ember, 0.95)
    pxa(ctx, bx + 5, TITLE_H - 38 - h - 2, 4, 3, P.emberLit, 0.9 * flick)
    pxa(ctx, bx - 6, TITLE_H - 48, 26, 30, P.ember, 0.05 * flick)
  }

  // spirit light bleeding through the arch — dithered, never a flat wash
  for (let i = 0; i < 5; i++) {
    const w = 34 - i * 6
    dither(
      ctx,
      66 - w / 2,
      10 + i * 3,
      w,
      TITLE_H - 30 - i * 8,
      i > 2 ? P.spiritLit : P.spirit,
      i > 1 ? 2 : 1,
      0.09 - i * 0.012,
    )
  }
  dither(ctx, 48, 10, 36, 6, P.spiritPale, 1, 0.12)
  pxLine(ctx, 66, 10, 66, 26, `rgba(122,183,214,0.1)`, 6)

  dither(ctx, 0, 0, TITLE_W, 10, '#000000', 1, 0.35)
  dither(ctx, 0, TITLE_H - 6, TITLE_W, 6, '#000000', 1, 0.25)
}
