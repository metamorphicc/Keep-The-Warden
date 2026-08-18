import { useEffect, useRef, useState } from 'react'
import { onFx, type FloatTone } from '../game/fx'

interface FloatItem {
  id: number
  text: string
  tone: FloatTone
  nx: number
  ny: number
}

const LIFE_MS = 1150

/**
 * Rising reward/need labels over the room. DOM rather than canvas so the
 * pixel font and text shadows match the rest of the HUD.
 */
export function FloatingTextLayer({ className }: { className?: string }) {
  const [items, setItems] = useState<FloatItem[]>([])
  const nextId = useRef(1)
  const stagger = useRef(0)

  useEffect(() => {
    const off = onFx((e) => {
      if (e.type !== 'float') return
      const id = nextId.current++
      // fan out concurrent labels so they do not stack on one line
      const slot = stagger.current++ % 3
      setItems((prev) => [
        ...prev.slice(-5),
        {
          id,
          text: e.text,
          tone: e.tone ?? 'plain',
          nx: e.nx ?? 0.5,
          ny: e.ny ?? 0.3 + slot * 0.07,
        },
      ])
      window.setTimeout(() => {
        setItems((prev) => prev.filter((it) => it.id !== id))
      }, LIFE_MS)
    })
    return off
  }, [])

  return (
    <div className={`floaters ${className ?? ''}`} aria-hidden="true">
      {items.map((it) => (
        <span
          key={it.id}
          className={`floater floater--${it.tone}`}
          style={{ left: `${it.nx * 100}%`, top: `${it.ny * 100}%` }}
        >
          {it.text}
        </span>
      ))}
    </div>
  )
}
