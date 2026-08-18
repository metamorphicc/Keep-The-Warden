import { PixelIcon } from './PixelIcon'

export interface CurrencyBarProps {
  coins: number
  shards: number
  className?: string
  compact?: boolean
}

/** Two carved counters: marks and spirit shards. */
export function CurrencyBar({ coins, shards, className, compact = false }: CurrencyBarProps) {
  return (
    <div className={`cur ${compact ? 'cur--compact' : ''} ${className ?? ''}`}>
      <span className="cur__item">
        <PixelIcon name="coin" size={14} />
        <b>{coins}</b>
      </span>
      <span className="cur__item">
        <PixelIcon name="shard" size={14} />
        <b>{shards}</b>
      </span>
    </div>
  )
}
