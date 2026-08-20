import { CurrencyBar } from '../components/CurrencyBar'
import { FloatingTextLayer } from '../components/FloatingTextLayer'
import { PixelBar } from '../components/PixelBar'
import { PixelButton } from '../components/PixelButton'
import { PixelIcon } from '../components/PixelIcon'
import { PixelPanel } from '../components/PixelPanel'
import { Ribbon } from '../components/Ribbon'
import { RoomCanvas } from '../components/RoomCanvas'
import { SpeechBox } from '../components/SpeechBox'
import { cooldownLeft, doAction, isAlarming, setScreen, statusLine } from '../game/actions'
import {
  ACTION_BAR,
  ACTIONS,
  BANKROLL_BAR,
  STATS,
  STAT_ORDER,
  WORLD,
  careerStatusForLevel,
  levelFromXp,
} from '../game/config'
import { bankrollHealth, useGameState } from '../game/store'
import { formatCash, formatSeconds } from '../game/util'

/* ==========================================================================
   The pit — the whole game in one screen.
   Room canvas on top, gauges and actions below, everything reachable with a
   thumb.
   ========================================================================== */

export function RoomScreen() {
  const s = useGameState()
  const now = Date.now()
  const day = Math.max(1, Math.floor((now - s.firstVisit) / 86_400_000) + 1)
  const stashCount = Object.values(s.stash).reduce((a, b) => a + b, 0)
  const level = levelFromXp(s.xp)
  const career = careerStatusForLevel(level)

  return (
    <div className="screen room">
      <header className="room__bar">
        <Ribbon size="sm">{WORLD.hall}</Ribbon>
        <span className="t-label t-dim room__day">Day {day}</span>
        <CurrencyBar bankroll={s.bankroll} credits={s.credits} compact />
      </header>

      <div className="room__stage">
        <RoomCanvas />
        <FloatingTextLayer />

        <button
          type="button"
          className="room__hero-tag"
          onClick={() => setScreen('profile')}
          aria-label="Open the trading record"
        >
          <span className="t-label t-gold">{s.name}</span>
          <span className="t-label t-dim">
            Lv. {level} · {career}
          </span>
        </button>

        <div className="room__speech">
          <SpeechBox text={s.line || statusLine(s.stats)} animKey={s.lineId} />
        </div>
      </div>

      <div className="room__hud">
        <PixelPanel variant="darkwood" pad="sm" rivets>
          <div className="room__bars">
            {STAT_ORDER.map((key) => {
              const meta = STATS[key]
              const value = s.stats[key]
              return (
                <PixelBar
                  key={key}
                  label={meta.label}
                  value={value}
                  color={meta.color}
                  colorDark={meta.colorDark}
                  low={isAlarming(key, value)}
                  showValue
                  size="sm"
                />
              )
            })}
            {/* the money line: a gauge against its own high-water mark, but it
                prints the actual number — a percentage of a peak is not a P&L */}
            <PixelBar
              label={BANKROLL_BAR.label}
              value={bankrollHealth(s.bankroll, s.peakBankroll)}
              color={BANKROLL_BAR.color}
              colorDark={BANKROLL_BAR.colorDark}
              low={s.bankroll < 25}
              valueText={formatCash(s.bankroll)}
              showValue
              size="sm"
            />
          </div>
        </PixelPanel>

        <div className="room__actions">
          {ACTION_BAR.map((id) => {
            const def = ACTIONS[id]!
            const left = cooldownLeft(id, now)
            const req = def.requires
            const value = req ? s.stats[req.stat] : 0
            const blocked = req
              ? (req.min !== undefined && value < req.min) ||
                (req.max !== undefined && value > req.max)
              : false
            return (
              <PixelButton
                key={id}
                label={def.label}
                icon={def.icon}
                variant={id === 'bet' ? 'ember' : id === 'scan' ? 'teal' : 'wood'}
                size="sm"
                stack
                disabled={left > 0}
                badge={id === 'research' && stashCount > 0 ? String(stashCount) : undefined}
                sublabel={left > 0 ? formatSeconds(left) : blocked ? 'no' : undefined}
                onClick={() => doAction(id)}
              />
            )
          })}
        </div>

        <nav className="room__nav">
          <button type="button" className="navbtn" onClick={() => setScreen('shop')}>
            <PixelIcon name="bag" size={14} />
            <span>Desk</span>
          </button>
          <button type="button" className="navbtn" onClick={() => setScreen('rig')}>
            <PixelIcon name="helm" size={14} />
            <span>Setup</span>
          </button>
          <button type="button" className="navbtn" onClick={() => setScreen('profile')}>
            <PixelIcon name="warden" size={14} />
            <span>Record</span>
          </button>
          <button type="button" className="navbtn" onClick={() => setScreen('settings')}>
            <PixelIcon name="gear" size={14} />
            <span>Office</span>
          </button>
        </nav>
      </div>
    </div>
  )
}
