import { useEffect, useRef, useState } from 'react'
import { ItemSlot } from '../components/ItemSlot'
import { PixelButton } from '../components/PixelButton'
import { PixelPanel } from '../components/PixelPanel'
import { ScreenHeader } from '../components/ScreenHeader'
import { FloatingTextLayer } from '../components/FloatingTextLayer'
import { equipCosmetic, say, setScreen } from '../game/actions'
import { COSMETICS, SLOT_LABEL, WORLD } from '../game/config'
import { getState, useGameState } from '../game/store'
import type { EquipSlot } from '../game/types'
import { dither, px, pxa, type Ctx } from '../render/draw'
import { drawWardenPortrait } from '../render/warden'
import { P } from '../styles/palette'

/* ==========================================================================
   Regalia — pick a look. Locked pieces stay visible, chained shut, so the
   player can see what the market is for.
   ========================================================================== */

const PW = 132
const PH = 96
const SLOTS: EquipSlot[] = ['head', 'cloak', 'blade']

export function WardrobeScreen() {
  const s = useGameState()
  const [slot, setSlot] = useState<EquipSlot>('head')
  const options = COSMETICS.filter((c) => c.slot === slot)

  return (
    <div className="screen">
      <ScreenHeader title="Regalia" />

      <div className="screen__body">
        <FloatingTextLayer />

        <PixelPanel variant="ink" pad="none" rivets>
          <div className="wardrobe__preview">
            <WardenPreview />
            <div className="wardrobe__plate">
              <span className="t-label t-gold">{WORLD.hero}</span>
              <span className="t-label t-dim">
                {SLOTS.map((k) => {
                  const id = s.look[k]
                  return id ? COSMETICS.find((c) => c.id === id)?.name : null
                })
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </div>
          </div>
        </PixelPanel>

        <div className="tabs">
          {SLOTS.map((k) => (
            <button
              key={k}
              type="button"
              className={`tab ${slot === k ? 'is-on' : ''}`}
              onClick={() => setSlot(k)}
            >
              <span>{SLOT_LABEL[k]}</span>
            </button>
          ))}
        </div>

        <PixelPanel variant="darkwood" pad="sm" rivets>
          <div className="grid grid--4">
            {options.map((item) => {
              const owned = s.owned.includes(item.id)
              return (
                <ItemSlot
                  key={item.id}
                  icon={item.icon}
                  label={item.name}
                  locked={!owned}
                  equipped={s.look[item.slot] === item.id}
                  selected={s.look[item.slot] === item.id}
                  price={owned ? undefined : { amount: item.price, currency: item.currency }}
                  onClick={() => {
                    if (!owned) {
                      say('Locked. The market takes coin, not opinions.')
                      return
                    }
                    equipCosmetic(item.id)
                  }}
                  ariaLabel={`${item.name}${owned ? '' : ', locked'}`}
                />
              )
            })}
          </div>
        </PixelPanel>

        <PixelButton
          label="Buy more in the Market"
          icon="bag"
          variant="ghost"
          size="sm"
          full
          onClick={() => setScreen('shop')}
        />
      </div>
    </div>
  )
}

/* --------------------------------------------------------------------------
   Live sprite preview, redraws whenever the equipped look changes.
   -------------------------------------------------------------------------- */

function WardenPreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = PW
    canvas.height = PH
    ctx.imageSmoothingEnabled = false

    let raf = 0
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // read live so equipping a piece shows up on the very next frame
      const s = getState()
      const t = s.settings.reduceMotion ? 1200 : now
      drawPedestal(ctx, t)
      drawWardenPortrait(ctx, PW / 2, PH - 8, s.look, t, s.needs)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={canvasRef} className="wardrobe__canvas" aria-hidden="true" />
}

function drawPedestal(ctx: Ctx, t: number): void {
  px(ctx, 0, 0, PW, PH, '#0e0a07')
  // back panelling
  for (let x = 0; x < PW; x += 14) {
    px(ctx, x, 0, 13, PH - 12, x % 28 === 0 ? '#1a1109' : '#160e08')
    px(ctx, x + 13, 0, 1, PH - 12, '#0a0604')
  }
  // stone step
  px(ctx, 0, PH - 12, PW, 12, P.stoneDark)
  px(ctx, 0, PH - 12, PW, 2, P.stoneLit)
  px(ctx, 0, PH - 3, PW, 3, '#181512')
  for (let x = 6; x < PW; x += 26) px(ctx, x, PH - 10, 1, 7, P.stoneDeep)

  // two candles for rim light
  const h = 4 + (Math.floor(t / 130) % 3)
  for (const cx of [10, PW - 14]) {
    px(ctx, cx, PH - 26, 5, 14, P.boneDim)
    px(ctx, cx, PH - 26, 5, 2, P.bone)
    pxa(ctx, cx + 1, PH - 26 - h, 3, h, P.emberLit, 0.95)
    pxa(ctx, cx - 8, PH - 44, 20, 28, P.ember, 0.06)
  }

  dither(ctx, 0, 0, PW, 12, '#000000', 1, 0.4)
  dither(ctx, 0, 0, 6, PH, '#000000', 1, 0.2)
  dither(ctx, PW - 6, 0, 6, PH, '#000000', 1, 0.2)
}
