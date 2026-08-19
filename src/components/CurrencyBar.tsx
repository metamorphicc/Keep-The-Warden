import { PixelIcon } from './PixelIcon'
import { formatCash } from '../game/util'

export interface CurrencyBarProps {
  /** simulated cash */
  bankroll: number
  credits: number
  className?: string
  compact?: boolean
}

/** Two carved counters: the simulated bankroll and the slower currency. */
export function CurrencyBar({ bankroll, credits, className, compact = false }: CurrencyBarProps) {
  return (
    <div className={`cur ${compact ? 'cur--compact' : ''} ${className ?? ''}`}>
      <span className="cur__item">
        <PixelIcon name="coin" size={14} />
        <b>{formatCash(bankroll)}</b>
      </span>
      <span className="cur__item">
        <PixelIcon name="shard" size={14} />
        <b>{credits}</b>
      </span>
    </div>
  )
}
