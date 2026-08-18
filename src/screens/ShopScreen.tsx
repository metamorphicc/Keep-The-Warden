import { useState } from 'react'
import { ItemSlot } from '../components/ItemSlot'
import { PixelButton } from '../components/PixelButton'
import { PixelIcon } from '../components/PixelIcon'
import { PixelPanel } from '../components/PixelPanel'
import { ScreenHeader } from '../components/ScreenHeader'
import { FloatingTextLayer } from '../components/FloatingTextLayer'
import { buyCosmetic, buyFood, say } from '../game/actions'
import { COSMETICS, FOODS, NEEDS, NEED_ORDER, SLOT_LABEL, WORLD } from '../game/config'
import { useGameState } from '../game/store'
import type { CosmeticDef, FoodDef } from '../game/types'

/* ==========================================================================
   Market — two shelves: provisions and regalia.
   ========================================================================== */

type Tab = 'larder' | 'regalia'

export function ShopScreen() {
  const s = useGameState()
  const [tab, setTab] = useState<Tab>('larder')
  const [foodId, setFoodId] = useState(FOODS[0]!.id)
  const [cosmeticId, setCosmeticId] = useState(
    COSMETICS.find((c) => !c.starter)!.id,
  )

  const food = FOODS.find((f) => f.id === foodId)!
  const cosmetic = COSMETICS.find((c) => c.id === cosmeticId)!
  const forSale = COSMETICS.filter((c) => !c.starter)

  const purse = (currency: 'coins' | 'shards') => (currency === 'coins' ? s.coins : s.shards)

  const buy = () => {
    const result = tab === 'larder' ? buyFood(food.id, 1) : buyCosmetic(cosmetic.id)
    say(result.message || (result.ok ? 'Bought.' : 'No.'))
  }

  const active: FoodDef | CosmeticDef = tab === 'larder' ? food : cosmetic
  const owned = tab === 'regalia' && s.owned.includes(cosmetic.id)
  const affordable = purse(active.currency) >= active.price

  return (
    <div className="screen">
      <ScreenHeader title="Deep Market" />

      <div className="screen__body">
        <FloatingTextLayer />

        <div className="tabs">
          <button
            type="button"
            className={`tab ${tab === 'larder' ? 'is-on' : ''}`}
            onClick={() => setTab('larder')}
          >
            <PixelIcon name="stew" size={14} />
            <span>Provisions</span>
          </button>
          <button
            type="button"
            className={`tab ${tab === 'regalia' ? 'is-on' : ''}`}
            onClick={() => setTab('regalia')}
          >
            <PixelIcon name="crown" size={14} />
            <span>Regalia</span>
          </button>
        </div>

        <PixelPanel variant="darkwood" pad="sm" rivets>
          <div className="grid grid--4">
            {tab === 'larder'
              ? FOODS.map((f) => (
                  <ItemSlot
                    key={f.id}
                    icon={f.icon}
                    label={f.name}
                    count={s.larder[f.id]}
                    selected={foodId === f.id}
                    price={{ amount: f.price, currency: f.currency }}
                    onClick={() => setFoodId(f.id)}
                    ariaLabel={`${f.name}, ${f.price} ${f.currency}`}
                  />
                ))
              : forSale.map((c) => (
                  <ItemSlot
                    key={c.id}
                    icon={c.icon}
                    label={c.name}
                    selected={cosmeticId === c.id}
                    locked={!s.owned.includes(c.id)}
                    equipped={s.owned.includes(c.id)}
                    price={
                      s.owned.includes(c.id)
                        ? undefined
                        : { amount: c.price, currency: c.currency }
                    }
                    onClick={() => setCosmeticId(c.id)}
                    ariaLabel={`${c.name}, ${c.price} ${c.currency}`}
                  />
                ))}
          </div>
        </PixelPanel>

        <PixelPanel
          variant="wood"
          title={active.name}
          titleIcon={active.icon}
          titleRight={
            <span className="t-label t-dim">
              {tab === 'larder' ? 'Provision' : SLOT_LABEL[(active as CosmeticDef).slot]}
            </span>
          }
          pad="md"
          rivets
        >
          <p className="t-body detail__desc">{active.desc}</p>

          {tab === 'larder' ? (
            <ul className="detail__gains">
              {NEED_ORDER.filter((k) => typeof food.gain[k] === 'number').map((k) => {
                const v = food.gain[k]!
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
          ) : null}

          <PixelButton
            label={owned ? 'Already owned' : affordable ? 'Buy' : 'Cannot afford'}
            icon={active.currency === 'coins' ? 'coin' : 'shard'}
            variant={owned ? 'ghost' : 'gold'}
            size="lg"
            full
            disabled={owned || !affordable}
            price={owned ? undefined : { amount: active.price, currency: active.currency }}
            onClick={buy}
          />

          {tab === 'larder' ? (
            <p className="t-label t-dim t-center screen__foot">
              In the larder: {s.larder[food.id] ?? 0}
            </p>
          ) : null}
        </PixelPanel>

        <p className="t-label t-dim t-center screen__foot">
          {WORLD.coinName} come from play and training. {WORLD.shardName} come from long work.
        </p>
      </div>
    </div>
  )
}
