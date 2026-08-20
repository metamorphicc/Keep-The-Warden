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
import { dither, px, pxa, pxLine, type Ctx } from '../render/draw'
import { drawWardenPortrait } from '../render/warden'

/* ==========================================================================
   Boot / title screen. Also the audio unlock gesture: the browser will not let
   us make a sound until the player touches something.
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
      drawStarterDesk(ctx, now)
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
          <span className="boot__title-small">- sim -</span>
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
        <div className="boot__intro">
          <p>Max is 18. The bankroll is simulated. The desk is real enough.</p>
          <ul>
            <li>Research builds Edge.</li>
            <li>Break restores Focus and cools Heat.</li>
            <li>Clean wins build Rep.</li>
          </ul>
        </div>

        <p className="t-body t-center boot__line">{line}</p>

        <PixelButton
          label={visits > 1 ? 'Back to the Desk' : 'Start at the Desk'}
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
          v{GAME_VERSION} - {WORLD.disclaimer}
        </p>
      </div>
    </div>
  )
}

function drawStarterDesk(ctx: Ctx, t: number): void {
  px(ctx, 0, 0, TITLE_W, TITLE_H, '#070a0f')

  // apartment wall and city window
  px(ctx, 0, 0, TITLE_W, TITLE_H - 14, '#111820')
  for (let x = 0; x < TITLE_W; x += 14) {
    px(ctx, x, 0, 1, TITLE_H - 14, '#0b1017')
    pxa(ctx, x + 1, 0, 1, TITLE_H - 14, '#ffffff', 0.035)
  }
  px(ctx, 32, 8, 68, 43, '#07111f')
  px(ctx, 32, 8, 68, 2, P.plateLit)
  px(ctx, 64, 8, 2, 43, P.plateDark)
  px(ctx, 32, 29, 68, 2, P.plateDark)
  for (let i = 0; i < 7; i++) {
    const bx = 36 + i * 8
    const bh = 10 + ((i * 7) % 18)
    px(ctx, bx, 48 - bh, 5, bh, '#0d2132')
    if (i % 2 === 0) px(ctx, bx + 1, 45 - bh / 2, 3, 1, P.spiritLit)
  }

  // floor
  px(ctx, 0, TITLE_H - 14, TITLE_W, 14, P.stoneDark)
  px(ctx, 0, TITLE_H - 14, TITLE_W, 2, P.stoneLit)
  for (let x = 0; x < TITLE_W; x += 22) px(ctx, x, TITLE_H - 12, 1, 12, P.stoneDeep)

  // starter desk and monitors
  px(ctx, 18, 62, 96, 9, P.wood)
  px(ctx, 18, 62, 96, 2, P.woodHi)
  px(ctx, 18, 70, 96, 2, P.woodDeep)
  drawMiniMonitor(ctx, 33, 44, 25, 18, t, 0)
  drawMiniMonitor(ctx, 72, 40, 28, 21, t, 1)
  px(ctx, 56, 62, 22, 4, P.plateDeep)
  px(ctx, 87, 66, 12, 3, P.bone)
  pxLine(ctx, 49, 72, 31, 92, P.plateDeep, 1)
  pxLine(ctx, 82, 72, 104, 92, P.plateDeep, 1)

  dither(ctx, 0, 0, TITLE_W, 10, '#000000', 1, 0.35)
  dither(ctx, 0, TITLE_H - 6, TITLE_W, 6, '#000000', 1, 0.25)
}

function drawMiniMonitor(ctx: Ctx, x: number, y: number, w: number, h: number, t: number, seed: number): void {
  px(ctx, x, y, w, h, P.plateDark)
  px(ctx, x, y, w, 1, P.plateLit)
  px(ctx, x + 2, y + 3, w - 4, h - 7, '#061018')
  const scan = Math.floor(t / 260 + seed * 3) % 6
  px(ctx, x + 5, y + 8, 6 + scan, 1, seed ? P.spiritLit : P.tealLit)
  pxLine(ctx, x + 4, y + h - 6, x + w - 5, y + 5 + scan, seed ? P.spiritLit : P.tealLit, 1)
  px(ctx, x + Math.floor(w / 2) - 1, y + h, 3, 5, P.plateDark)
}
