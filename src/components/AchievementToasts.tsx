import { useEffect, useState } from 'react'
import { onAchievementToast, type AchievementToastEvent } from '../game/fx'
import { PixelIcon } from './PixelIcon'

const LIFE_MS = 3600
const MAX = 2

export function AchievementToasts() {
  const [items, setItems] = useState<AchievementToastEvent[]>([])

  useEffect(() => {
    const off = onAchievementToast((achievement) => {
      setItems((prev) => [...prev, achievement].slice(-MAX))
      window.setTimeout(() => {
        setItems((prev) => prev.filter((item) => item.id !== achievement.id))
      }, LIFE_MS)
    })
    return off
  }, [])

  if (items.length === 0) return null

  return (
    <div className="achievement-popups" role="status" aria-live="polite">
      {items.map((item) => (
        <div key={item.id} className="achievement-popup">
          <div className="achievement-popup__icon">
            <PixelIcon name="star" size={18} />
          </div>
          <div className="achievement-popup__body">
            <span className="achievement-popup__eyebrow">Achievement unlocked</span>
            <b>{item.name}</b>
            <span>{item.desc}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
