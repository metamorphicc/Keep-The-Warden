import { useEffect, useRef } from 'react'
import { doAction, petWarden, say, setScreen } from '../game/actions'
import { COPY } from '../game/copy'
import { burst, onFx } from '../game/fx'
import { play } from '../game/sound'
import { getState } from '../game/store'
import { ParticleSystem } from '../render/particles'
import { HOTSPOTS, SCENE, drawRoom, drawRoomOverlay, hitTest } from '../render/room'
import { drawWarden, poseFor } from '../render/warden'
import { clamp } from '../game/util'

/* ==========================================================================
   The room stage: one low-res canvas, one requestAnimationFrame loop.
   State is read straight from the store each frame instead of via props, so
   the 60fps scene never triggers a React render.
   ========================================================================== */

/** Where particles appear when an fx event does not name a position. */
const CHEST_X = SCENE.heroX
const CHEST_Y = SCENE.heroY - 34

export function RoomCanvas() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scaleRef = useRef(2)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return
    canvas.width = SCENE.w
    canvas.height = SCENE.h
    ctx.imageSmoothingEnabled = false

    const particles = new ParticleSystem(SCENE.heroY + 14)

    /* ---- integer upscaling keeps every pixel square ---- */
    const resize = () => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (!w || !h) return
      const byWidth = Math.floor(w / SCENE.w)
      // never smaller than 2x — we crop the ceiling instead of shrinking him
      const scale = Math.max(2, Math.min(byWidth, Math.ceil(h / SCENE.h) + 1))
      scaleRef.current = scale
      canvas.style.width = `${SCENE.w * scale}px`
      canvas.style.height = `${SCENE.h * scale}px`
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)

    /* ---- fx bus ---- */
    let shake = 0
    const offFx = onFx((e) => {
      if (e.type === 'burst') {
        particles.spawn(e.kind, e.x ?? CHEST_X, e.y ?? CHEST_Y, e.count ?? 8, e.power ?? 1)
      } else if (e.type === 'shake') {
        shake = Math.max(shake, e.power ?? 1)
      }
    })

    /* ---- loop ---- */
    let raf = 0
    let last = performance.now()
    let ambient = 0

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(64, now - last)
      last = now

      const s = getState()
      const reduce = s.settings.reduceMotion
      const act = s.activity
      const elapsed = Date.now() - act.startedAt
      const phase = act.duration > 0 ? clamp(elapsed / act.duration, 0, 1) : 1
      const kind = phase >= 1 ? 'idle' : act.kind

      const grime = s.needs.clean < 20 ? 2 : s.needs.clean < 45 ? 1 : 0
      // the hall darkens while he sleeps
      const dim = kind === 'sleep' ? Math.sin(clamp(phase * 2.4, 0, 1) * Math.PI * 0.5) * 0.55 : 0
      const spirit = s.needs.spirit / 100

      const pose = poseFor({ activity: kind, phase, t: reduce ? 1200 : now, needs: s.needs })

      const opts = {
        t: reduce ? 0 : now,
        grime,
        dim,
        spirit,
        // his shadow walks to the mat with him and thins as he folds up
        heroShift: pose.shift,
        heroShadow: 1 - pose.sit * 0.72,
      }

      drawRoom(ctx, opts)
      drawWarden(ctx, SCENE.heroX, SCENE.heroY, pose, s.look, reduce ? 1200 : now)

      // ambient motes drifting through the torchlight
      ambient += dt
      if (!reduce && ambient > 420) {
        ambient = 0
        particles.spawn(
          'dust',
          30 + Math.random() * 132,
          SCENE.heroY - 62 + Math.random() * 60,
          1,
          0.4,
        )
        const torchY = HOTSPOTS.torchL.y + 6
        if (Math.random() < 0.5) particles.spawn('ember', 26, torchY, 1, 0.6)
        if (Math.random() < 0.5) particles.spawn('ember', 166, torchY, 1, 0.6)
      }
      // steady sleep marks
      if (kind === 'sleep' && phase > 0.2 && phase < 0.85 && Math.random() < dt / 900) {
        particles.spawn('zzz', SCENE.heroX - 48, SCENE.heroY - 40, 1, 0.8)
      }

      if (!reduce) particles.update(dt)
      particles.draw(ctx)

      drawRoomOverlay(ctx, opts)

      // screen shake, applied to the wrapper so the canvas stays pixel-aligned
      if (shake > 0.01) {
        shake = Math.max(0, shake - dt / 260)
        const amp = Math.round(shake * 4)
        const ox = ((Math.random() * 2 - 1) * amp) | 0
        const oy = ((Math.random() * 2 - 1) * amp) | 0
        canvas.style.transform = reduce ? '' : `translate(${ox}px, ${oy}px)`
      } else if (canvas.style.transform) {
        canvas.style.transform = ''
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      offFx()
    }
  }, [])

  /* ---- taps ---- */
  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scale = scaleRef.current
    const x = (e.clientX - rect.left) / scale
    const y = (e.clientY - rect.top) / scale

    const hit = hitTest(x, y)
    switch (hit) {
      case 'hero':
        petWarden(x, y)
        break
      case 'cauldron':
        say(COPY.cauldron())
        setScreen('feed')
        break
      case 'bed':
        say(COPY.bed())
        doAction('sleep')
        break
      case 'torchL':
      case 'torchR':
        say(COPY.torch())
        play('spark')
        emberPuff(hit)
        break
      case 'door':
        say(COPY.door())
        play('deny')
        break
      default:
        // empty floor / wall: a small acknowledgement so taps never feel dead
        play('click')
        break
    }
  }

  return (
    <div className="stage" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="stage__canvas"
        onPointerDown={onPointerDown}
        aria-label="The Deep Hall. Tap the Warden."
        role="img"
      />
    </div>
  )
}

/** Kick a few embers off a wall torch. */
function emberPuff(which: 'torchL' | 'torchR'): void {
  const h = HOTSPOTS[which]
  burst('ember', { x: h.x + h.w / 2, y: h.y + 6, count: 8, power: 1.4 })
}
