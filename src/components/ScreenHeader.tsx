import { setScreen } from '../game/actions'
import { useGame } from '../game/store'
import { CurrencyBar } from './CurrencyBar'
import { PixelIcon } from './PixelIcon'
import { Ribbon } from './Ribbon'

export interface ScreenHeaderProps {
  title: string
  /** hide the bankroll/credit counters (settings screen) */
  showCurrency?: boolean
}

/** Back arrow + title ribbon + counters. Shared by every sub-screen. */
export function ScreenHeader({ title, showCurrency = true }: ScreenHeaderProps) {
  const { bankroll, credits } = useGame((s) => ({ bankroll: s.bankroll, credits: s.credits }))

  return (
    <header className="shead">
      <button
        type="button"
        className="shead__back"
        onClick={() => setScreen('room')}
        aria-label="Back to the pit"
      >
        <PixelIcon name="arrowLeft" size={16} />
      </button>

      <Ribbon size="sm">{title}</Ribbon>

      {showCurrency ? (
        <CurrencyBar bankroll={bankroll} credits={credits} compact />
      ) : (
        <span className="shead__spacer" />
      )}
    </header>
  )
}
