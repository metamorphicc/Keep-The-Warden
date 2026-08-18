import { useCallback, useEffect, useRef, useState } from 'react'
import { FloatingTextLayer } from '../components/FloatingTextLayer'
import { PixelBar } from '../components/PixelBar'
import { PixelButton } from '../components/PixelButton'
import { PixelIcon } from '../components/PixelIcon'
import { PixelPanel } from '../components/PixelPanel'
import { ScreenHeader } from '../components/ScreenHeader'
import { beginTraining, finishTraining, registerHit, say } from '../game/actions'
import { TRAIN, WORLD } from '../game/config'
import { COPY } from '../game/copy'
import { floatText } from '../game/fx'
import { play } from '../game/sound'
import { getState, useGameState } from '../game/store'
import { clamp, formatSeconds } from '../game/util'
import { ParticleSystem } from '../render/particles'
import { PIT, drawPit, dummyHitTest } from '../render/dummy'
import { P } from '../styles/palette'

/* ==========================================================================
   Training pit — tap the dummy for fifteen seconds. Taps inside the combo
   window chain; the chain multiplies nothing but pride and a few coins.
   ========================================================================== */

type Phase = 'ready' | 'running' | 'done'

interface Result {
  hits: number
  bestCombo: number
  coins: number
  shards: number
}

export function TrainScreen() {
  const s = useGameState()
  const [phase, setPhase] = useState<Phase>('ready')
  const [hits, setHits] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [msLeft, setMsLeft] = useState(TRAIN.durationMs)
  const [result, setResult] = useState<Result | null>(null)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scaleRef = useRef(2)
  const runtime = useRef({
    endsAt: 0,
    lastHit: -9999,
    hits: 0,
    combo: 0,
    best: 0,
    active: false,
  })

  /* ---- canvas loop ---- */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return
    canvas.width = PIT.w
    canvas.height = PIT.h
    ctx.imageSmoothingEnabled = false

    const particles = new ParticleSystem(PIT.dummyY - 4)
    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const scale = Math.max(2, Math.floor(parent.clientWidth / PIT.w))
      scaleRef.current = scale
      canvas.style.width = `${PIT.w * scale}px`
      canvas.style.height = `${PIT.h * scale}px`
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    let raf = 0
    let last = performance.now()
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(64, now - last)
      last = now
      const r = runtime.current
      const reduce = getState().settings.reduceMotion

      drawPit(ctx, {
        t: reduce ? 0 : now,
        sinceHit: now - r.lastHit,
        wear: clamp(r.hits / 30, 0, 1),
        combo: r.combo,
        active: r.active,
      })

      if (now - r.lastHit < 260) {
        // straw kicked loose on impact
        if (Math.random() < dt / 60) {
          particles.spawn('straw', PIT.dummyX + 4, PIT.dummyY - 52, 2, 1.2)
        }
      }
      if (!reduce) particles.update(dt)
      particles.draw(ctx)

      // combo pips above the dummy
      if (r.combo > 1) {
        for (let i = 0; i < r.combo; i++) {
          const c = i >= 5 ? P.emberLit : i >= 2 ? P.goldLit : P.bone
          ctx.fillStyle = c
          ctx.fillRect(PIT.dummyX - r.combo * 3 + i * 6, 34, 4, 4)
        }
      }
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  const stop = useCallback(() => {
    const r = runtime.current
    if (!r.active) return
    r.active = false
    const out = finishTraining(r.hits, r.best)
    setResult({
      hits: r.hits,
      bestCombo: r.best,
      coins: out.coins ?? 0,
      shards: out.shards ?? 0,
    })
    setPhase('done')
  }, [])

  /* ---- countdown (performance.now throughout, same clock as the canvas) ---- */
  useEffect(() => {
    if (phase !== 'running') return
    const id = window.setInterval(() => {
      const r = runtime.current
      const now = performance.now()
      setMsLeft(Math.max(0, r.endsAt - now))
      // the chain lapses if he stops swinging
      if (r.combo > 0 && now - r.lastHit > TRAIN.comboWindowMs) {
        r.combo = 0
        setCombo(0)
      }
      if (r.endsAt - now <= 0) stop()
    }, 100)
    return () => window.clearInterval(id)
  }, [phase, stop])

  const start = () => {
    if (!beginTraining()) return
    const r = runtime.current
    r.endsAt = performance.now() + TRAIN.durationMs
    r.lastHit = -9999
    r.hits = 0
    r.combo = 0
    r.best = 0
    r.active = true
    setHits(0)
    setCombo(0)
    setBestCombo(0)
    setResult(null)
    setMsLeft(TRAIN.durationMs)
    setPhase('running')
    say(COPY.train())
    play('sword')
  }

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = runtime.current
    if (!r.active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scale = scaleRef.current
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale
    if (!dummyHitTest(x, y)) {
      play('deny')
      return
    }

    const now = performance.now()
    const chained = now - r.lastHit < TRAIN.comboWindowMs
    r.combo = chained ? Math.min(TRAIN.maxCombo, r.combo + 1) : 1
    r.best = Math.max(r.best, r.combo)
    r.hits += 1
    r.lastHit = now

    setHits(r.hits)
    setCombo(r.combo)
    setBestCombo(r.best)
    registerHit(r.combo)
    if (r.combo >= 3 && r.combo % 3 === 0) floatText(`${r.combo} chain!`, 'coin')
  }

  const timePct = (msLeft / TRAIN.durationMs) * 100

  return (
    <div className="screen">
      <ScreenHeader title="Training Pit" />

      <div className="screen__body train">
        <FloatingTextLayer />

        <div className="train__stage">
          <canvas
            ref={canvasRef}
            className="train__canvas"
            onPointerDown={onPointerDown}
            aria-label="Training dummy. Tap it."
            role="img"
          />
          {phase !== 'running' ? (
            <div className="train__overlay">
              {phase === 'ready' ? (
                <>
                  <p className="t-title train__big">Strike the dummy</p>
                  <p className="t-body t-dim t-center">
                    {TRAIN.durationMs / 1000} seconds. Keep the rhythm to chain hits.
                  </p>
                </>
              ) : (
                <p className="t-title train__big">Time</p>
              )}
            </div>
          ) : null}
        </div>

        <PixelPanel variant="darkwood" pad="sm" rivets>
          <div className="train__meters">
            <PixelBar
              label="Time"
              value={timePct}
              color={P.tealLit}
              colorDark={P.tealDeep}
              size="sm"
            />
            <div className="train__stats">
              <span className="t-label">
                <PixelIcon name="dummy" size={12} /> Hits <b>{hits}</b>
              </span>
              <span className="t-label">
                <PixelIcon name="star" size={12} /> Chain <b>{combo}</b>
              </span>
              <span className="t-label t-dim">
                Best <b>{Math.max(bestCombo, s.stats.bestCombo)}</b>
              </span>
            </div>
          </div>
        </PixelPanel>

        {phase === 'done' && result ? (
          <PixelPanel variant="wood" title="Tally" titleIcon="star" pad="md" rivets>
            <ul className="detail__gains">
              <li className="is-up">
                <PixelIcon name="dummy" size={12} />
                <span>Hits landed</span>
                <b>{result.hits}</b>
              </li>
              <li className="is-up">
                <PixelIcon name="star" size={12} />
                <span>Longest chain</span>
                <b>{result.bestCombo}</b>
              </li>
              <li className="is-up">
                <PixelIcon name="coin" size={12} />
                <span>{WORLD.coinName}</span>
                <b>+{result.coins}</b>
              </li>
              {result.shards > 0 ? (
                <li className="is-up">
                  <PixelIcon name="shard" size={12} />
                  <span>{WORLD.shardName}</span>
                  <b>+{result.shards}</b>
                </li>
              ) : null}
            </ul>
          </PixelPanel>
        ) : null}

        {phase === 'running' ? (
          <PixelButton
            label={`Stop · ${formatSeconds(msLeft)}`}
            icon="close"
            variant="danger"
            size="lg"
            full
            onClick={stop}
          />
        ) : (
          <PixelButton
            label={phase === 'done' ? 'Go again' : 'Begin'}
            icon="sword"
            variant="teal"
            size="lg"
            full
            disabled={s.needs.energy < TRAIN.energyCost}
            sublabel={
              s.needs.energy < TRAIN.energyCost
                ? 'Not enough energy'
                : `Costs ${TRAIN.energyCost} energy`
            }
            onClick={start}
          />
        )}
      </div>
    </div>
  )
}
