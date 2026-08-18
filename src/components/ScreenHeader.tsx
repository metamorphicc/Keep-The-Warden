import { setScreen } from '../game/actions'
import { useGame } from '../game/store'
import { CurrencyBar } from './CurrencyBar'
import { PixelIcon } from './PixelIcon'
import { Ribbon } from './Ribbon'

export interface ScreenHeaderProps {
  title: string
  /** hide the coin/shard counters (settings screen) */
  showCurrency?: boolean
}

/** Back arrow + title ribbon + purse. Shared by every sub-screen. */
export function ScreenHeader({ title, showCurrency = true }: ScreenHeaderProps) {
  const { coins, shards } = useGame((s) => ({ coins: s.coins, shards: s.shards }))

  return (
    <header className="shead">
      <button
        type="button"
        className="shead__back"
        onClick={() => setScreen('room')}
        aria-label="Back to the hall"
      >
        <PixelIcon name="arrowLeft" size={16} />
      </button>

      <Ribbon size="sm">{title}</Ribbon>

      {showCurrency ? (
        <CurrencyBar coins={coins} shards={shards} compact />
      ) : (
        <span className="shead__spacer" />
      )}
    </header>
  )
}
