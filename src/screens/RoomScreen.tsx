import { CurrencyBar } from '../components/CurrencyBar'
import { FloatingTextLayer } from '../components/FloatingTextLayer'
import { PixelBar } from '../components/PixelBar'
import { PixelButton } from '../components/PixelButton'
import { PixelIcon } from '../components/PixelIcon'
import { PixelPanel } from '../components/PixelPanel'
import { Ribbon } from '../components/Ribbon'
import { RoomCanvas } from '../components/RoomCanvas'
import { SpeechBox } from '../components/SpeechBox'
import { cooldownLeft, doAction, setScreen, statusLine } from '../game/actions'
import { ACTION_BAR, ACTIONS, NEEDS, NEED_LOW, NEED_ORDER, WORLD } from '../game/config'
import { overallMood, useGameState } from '../game/store'
import { formatSeconds } from '../game/util'

/* ==========================================================================
   Main room — the whole game in one screen.
   Room canvas on top, needs and actions below, everything reachable with a
   thumb.
   ========================================================================== */

export function RoomScreen() {
  const s = useGameState()
  const now = Date.now()
  const day = Math.max(1, Math.floor((now - s.firstVisit) / 86_400_000) + 1)
  const mood = overallMood(s.needs)
  const larderCount = Object.values(s.larder).reduce((a, b) => a + b, 0)

  return (
    <div className="screen room">
      <header className="room__bar">
        <Ribbon size="sm">{WORLD.hall}</Ribbon>
        <span className="t-label t-dim room__day">Day {day}</span>
        <CurrencyBar coins={s.coins} shards={s.shards} compact />
      </header>

      <div className="room__stage">
        <RoomCanvas />
        <FloatingTextLayer />

        <div className="room__hero-tag">
          <span className="t-label t-gold">{WORLD.hero}</span>
          <span className="t-label t-dim">
            {mood >= 70 ? 'Holding the line' : mood >= 40 ? 'Managing' : 'Barely'}
          </span>
        </div>

        <div className="room__speech">
          <SpeechBox text={s.line || statusLine(s.needs)} animKey={s.lineId} />
        </div>
      </div>

      <div className="room__hud">
        <PixelPanel variant="darkwood" pad="sm" rivets>
          <div className="room__bars">
            {NEED_ORDER.map((key) => {
              const meta = NEEDS[key]
              const value = s.needs[key]
              return (
                <PixelBar
                  key={key}
                  label={meta.label}
                  value={value}
                  color={meta.color}
                  colorDark={meta.colorDark}
                  low={value < NEED_LOW}
                  showValue
                  size="sm"
                />
              )
            })}
          </div>
        </PixelPanel>

        <div className="room__actions">
          {ACTION_BAR.map((id) => {
            const def = ACTIONS[id]!
            const left = cooldownLeft(id, now)
            const blocked = def.requires ? s.needs[def.requires.need] < def.requires.min : false
            return (
              <PixelButton
                key={id}
                label={def.label}
                icon={def.icon}
                variant={id === 'feed' ? 'ember' : id === 'train' ? 'teal' : 'wood'}
                size="sm"
                stack
                disabled={left > 0}
                badge={id === 'feed' && larderCount > 0 ? String(larderCount) : undefined}
                sublabel={left > 0 ? formatSeconds(left) : blocked ? 'low' : undefined}
                onClick={() => doAction(id)}
              />
            )
          })}
        </div>

        <nav className="room__nav">
          <button type="button" className="navbtn" onClick={() => setScreen('shop')}>
            <PixelIcon name="bag" size={14} />
            <span>Market</span>
          </button>
          <button type="button" className="navbtn" onClick={() => setScreen('wardrobe')}>
            <PixelIcon name="helm" size={14} />
            <span>Regalia</span>
          </button>
          <button type="button" className="navbtn" onClick={() => setScreen('settings')}>
            <PixelIcon name="gear" size={14} />
            <span>Keep</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
