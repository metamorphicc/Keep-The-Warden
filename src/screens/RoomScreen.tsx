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
  ACTIONS,
  BANKROLL_BAR,
  DESK_STAT_ORDER,
  STAT_HIGH,
  STATS,
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
  const broke = s.bankroll <= 0
  const inTicket = s.activity.kind === 'bet'
  const hedgeOn = now < s.hedgeUntil
  const heatHigh = s.stats.heat >= STAT_HIGH
  const focusLow = s.stats.focus < 28
  const primaryId = broke ? 'sidejob' : 'bet'

  const plainStatus = (() => {
    if (broke) return 'Bankroll is gone. Take a side job.'
    if (inTicket) return "You're in a ticket. Hedge or ride it."
    if (hedgeOn) return 'Hedge is on. Next ticket is dampened.'
    if (heatHigh) return 'Heat is high. Take a break.'
    if (focusLow) return 'Focus is low. Take a break.'
    return 'No open ticket.'
  })()

  const actionState = (id: string) => {
    const def = ACTIONS[id]!
    const left = cooldownLeft(id, now)
    const req = def.requires
    const value = req ? s.stats[req.stat] : 0
    const blocked = req
      ? (req.min !== undefined && value < req.min) ||
        (req.max !== undefined && value > req.max)
      : false
    return { def, left, blocked }
  }

  const actionSub = (id: string, blocked: boolean, left: number): string | undefined => {
    if (left > 0) return formatSeconds(left)
    if (blocked) return 'not ready'
    if (id === 'bet') return 'take a trade'
    if (id === 'research') return 'improve edge'
    if (id === 'hedge') return inTicket || hedgeOn ? 'reduce risk' : 'risk prep'
    if (id === 'recover') return 'recover focus'
    if (id === 'sidejob') return broke ? 'earn money' : 'extra cash'
    if (id === 'scan') return 'scan markets'
    return undefined
  }

  const renderAction = (
    id: string,
    opts: { primary?: boolean; utility?: boolean; secondary?: boolean } = {},
  ) => {
    const { def, left, blocked } = actionState(id)
    const isPrimary = opts.primary
    const visuallyMutedHedge = id === 'hedge' && !inTicket && !hedgeOn
    return (
      <PixelButton
        key={id}
        label={id === 'bet' ? 'Ticket' : def.label}
        icon={def.icon}
        variant={
          isPrimary
            ? id === 'sidejob'
              ? 'gold'
              : 'ember'
            : opts.utility || opts.secondary || visuallyMutedHedge
              ? 'ghost'
              : 'wood'
        }
        size={isPrimary ? 'lg' : opts.utility || opts.secondary ? 'sm' : 'md'}
        full={isPrimary || opts.secondary}
        disabled={left > 0}
        badge={id === 'research' && stashCount > 0 ? String(stashCount) : undefined}
        sublabel={actionSub(id, blocked, left)}
        className={[
          isPrimary ? 'room__action-primary' : '',
          opts.utility ? 'room__action-utility' : '',
          opts.secondary ? 'room__action-secondary' : '',
          visuallyMutedHedge ? 'room__action-muted' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={() => doAction(id)}
      />
    )
  }

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
        <div className={`room__status ${broke ? 'is-broke' : ''}`}>
          <span className="room__status-text">{plainStatus}</span>
          {renderAction('scan', { utility: true })}
        </div>

        <PixelPanel variant="darkwood" pad="sm" rivets>
          <div className="room__bars">
            {DESK_STAT_ORDER.map((key) => {
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

        <div className={`room__trade-actions ${broke ? 'is-broke' : ''}`}>
          {renderAction(primaryId, { primary: true })}
          {!broke ? (
            <div className="room__support-actions">
              {renderAction('research')}
              {renderAction('hedge')}
              {renderAction('recover')}
            </div>
          ) : (
            <div className="room__support-actions room__support-actions--broke">
              {renderAction('bet')}
              {renderAction('research')}
              {renderAction('hedge')}
              {renderAction('recover')}
            </div>
          )}
        </div>

        {!broke ? <div className="room__sidejob-row">{renderAction('sidejob', { secondary: true })}</div> : null}

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
