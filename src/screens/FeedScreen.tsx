import { useState } from 'react'
import { ItemSlot } from '../components/ItemSlot'
import { PixelButton } from '../components/PixelButton'
import { PixelIcon } from '../components/PixelIcon'
import { PixelPanel } from '../components/PixelPanel'
import { ScreenHeader } from '../components/ScreenHeader'
import { FloatingTextLayer } from '../components/FloatingTextLayer'
import { feedFromLarder, say, setScreen } from '../game/actions'
import { FOODS, NEEDS, NEED_ORDER } from '../game/config'
import { useGameState } from '../game/store'

/* ==========================================================================
   Feed menu — what is actually in the larder, plus one dry line per dish.
   ========================================================================== */

export function FeedScreen() {
  const s = useGameState()
  const stocked = FOODS.filter((f) => (s.larder[f.id] ?? 0) > 0)
  const [selectedId, setSelectedId] = useState<string | null>(stocked[0]?.id ?? null)

  const selected = stocked.find((f) => f.id === selectedId) ?? stocked[0] ?? null
  const stock = selected ? (s.larder[selected.id] ?? 0) : 0
  const full = s.needs.hunger >= 98

  const serve = () => {
    if (!selected) return
    const result = feedFromLarder(selected.id)
    if (result.ok && (s.larder[selected.id] ?? 0) - 1 <= 0) {
      const next = stocked.find((f) => f.id !== selected.id)
      setSelectedId(next?.id ?? null)
    }
    if (!result.ok && result.message) say(result.message)
  }

  return (
    <div className="screen">
      <ScreenHeader title="The Larder" />

      <div className="screen__body">
        <FloatingTextLayer />

        <PixelPanel variant="darkwood" title="Stores" titleIcon="stew" pad="sm" rivets>
          {stocked.length ? (
            <div className="grid grid--4">
              {stocked.map((food) => (
                <ItemSlot
                  key={food.id}
                  icon={food.icon}
                  label={food.name}
                  count={s.larder[food.id]}
                  selected={selected?.id === food.id}
                  onClick={() => setSelectedId(food.id)}
                  ariaLabel={`${food.name}, ${s.larder[food.id]} left`}
                />
              ))}
              {Array.from({ length: Math.max(0, 4 - (stocked.length % 4 || 4)) }).map((_, i) => (
                <ItemSlot key={`pad-${i}`} empty />
              ))}
            </div>
          ) : (
            <div className="empty-note">
              <PixelIcon name="skull" size={20} />
              <p className="t-body t-dim">
                Empty. Shelves, dust, and one optimistic spider.
              </p>
              <PixelButton
                label="Go to Market"
                icon="bag"
                variant="gold"
                size="sm"
                onClick={() => setScreen('shop')}
              />
            </div>
          )}
        </PixelPanel>

        {selected ? (
          <PixelPanel
            variant="wood"
            title={selected.name}
            titleIcon={selected.icon}
            titleRight={<span className="t-label t-dim">x{stock}</span>}
            pad="md"
            rivets
          >
            <p className="t-body detail__desc">{selected.desc}</p>

            <ul className="detail__gains">
              {NEED_ORDER.filter((k) => typeof selected.gain[k] === 'number').map((k) => {
                const v = selected.gain[k]!
                return (
                  <li key={k} className={v > 0 ? 'is-up' : 'is-down'}>
                    <PixelIcon name={NEEDS[k].icon} size={12} />
                    <span>{NEEDS[k].label}</span>
                    <b>
                      {v > 0 ? '+' : ''}
                      {v}
                    </b>
                  </li>
                )
              })}
            </ul>

            <PixelButton
              label={full ? 'He is full' : 'Serve it'}
              icon="stew"
              variant="ember"
              size="lg"
              full
              disabled={full || stock <= 0}
              onClick={serve}
            />
          </PixelPanel>
        ) : null}

        <p className="t-label t-dim t-center screen__foot">
          Hunger {Math.round(s.needs.hunger)} / 100
        </p>
      </div>
    </div>
  )
}
