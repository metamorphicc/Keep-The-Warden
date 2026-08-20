import { useState } from 'react'
import { ItemSlot } from '../components/ItemSlot'
import { PixelButton } from '../components/PixelButton'
import { PixelIcon, type IconName } from '../components/PixelIcon'
import { PixelPanel } from '../components/PixelPanel'
import { ScreenHeader } from '../components/ScreenHeader'
import { FloatingTextLayer } from '../components/FloatingTextLayer'
import { buyRig, buySupply, say } from '../game/actions'
import { RIGS, SLOT_LABEL, STATS, STAT_ORDER, SUPPLIES, WORLD } from '../game/config'
import { useGameState } from '../game/store'
import type { Currency, RigBonus, RigDef, SupplyDef } from '../game/types'

/* ==========================================================================
   Supply — two shelves: what he reads, and what he wears while reading it.
   ========================================================================== */

type Tab = 'stash' | 'rig'

const RIG_BONUS_TEXT: Record<keyof RigBonus, { label: string; icon: IconName; value: (v: number) => string }> = {
  scanFocusSave: { label: 'Scan focus', icon: 'dice', value: (v) => `-${v}` },
  scanHeatSave: { label: 'Scan heat', icon: 'flame', value: (v) => `-${v}` },
  betFocusSave: { label: 'Ticket focus', icon: 'terminal', value: (v) => `-${v}` },
  betHeatSave: { label: 'Ticket heat', icon: 'flame', value: (v) => `-${v}` },
  readFocusSave: { label: 'Read focus', icon: 'stew', value: (v) => `-${v}` },
  recoverFocusAdd: { label: 'Break focus', icon: 'bed', value: (v) => `+${v}` },
  recoverHeatClearAdd: { label: 'Break heat clear', icon: 'bed', value: (v) => `+${v}` },
  hedgeHeatClearAdd: { label: 'Hedge heat clear', icon: 'brush', value: (v) => `+${v}` },
  edgeSwingAdd: { label: 'Edge swing', icon: 'star', value: (v) => `+${Math.round(v * 1000) / 10}%` },
  feeDiscount: { label: 'Ticket fee', icon: 'coin', value: (v) => `-${Math.round(v * 1000) / 10}%` },
  staleSlipSave: { label: 'Stale slip', icon: 'skull', value: (v) => `-${Math.round(v * 100)}c` },
  heatSlipSave: { label: 'Heat slip', icon: 'flame', value: (v) => `-${Math.round(v * 100)}c` },
  winXpAdd: { label: 'Win XP', icon: 'star', value: (v) => `+${v}` },
  lossXpAdd: { label: 'Loss XP', icon: 'star', value: (v) => `+${v}` },
}

export function ShopScreen() {
  const s = useGameState()
  const [tab, setTab] = useState<Tab>('stash')
  const [supplyId, setSupplyId] = useState(SUPPLIES[0]!.id)
  const [rigId, setRigId] = useState(RIGS.find((r) => !r.starter)!.id)

  const supply = SUPPLIES.find((f) => f.id === supplyId)!
  const rig = RIGS.find((r) => r.id === rigId)!
  const forSale = RIGS.filter((r) => !r.starter)

  const purse = (currency: Currency) => (currency === 'bankroll' ? s.bankroll : s.credits)

  const buy = () => {
    const result = tab === 'stash' ? buySupply(supply.id, 1) : buyRig(rig.id)
    say(result.message || (result.ok ? 'Bought.' : 'No.'))
  }

  const active: SupplyDef | RigDef = tab === 'stash' ? supply : rig
  const owned = tab === 'rig' && s.owned.includes(rig.id)
  const affordable = purse(active.currency) >= active.price

  return (
    <div className="screen">
      <ScreenHeader title="Supply" />

      <div className="screen__body">
        <FloatingTextLayer />

        <div className="tabs">
          <button
            type="button"
            className={`tab ${tab === 'stash' ? 'is-on' : ''}`}
            onClick={() => setTab('stash')}
          >
            <PixelIcon name="stew" size={14} />
            <span>Notes</span>
          </button>
          <button
            type="button"
            className={`tab ${tab === 'rig' ? 'is-on' : ''}`}
            onClick={() => setTab('rig')}
          >
            <PixelIcon name="crown" size={14} />
            <span>Rig</span>
          </button>
        </div>

        <PixelPanel variant="darkwood" pad="sm" rivets>
          <div className="grid grid--4">
            {tab === 'stash'
              ? SUPPLIES.map((f) => (
                  <ItemSlot
                    key={f.id}
                    icon={f.icon}
                    label={f.name}
                    count={s.stash[f.id]}
                    selected={supplyId === f.id}
                    price={{ amount: f.price, currency: f.currency }}
                    onClick={() => setSupplyId(f.id)}
                    ariaLabel={`${f.name}, ${f.price} ${f.currency}`}
                  />
                ))
              : forSale.map((r) => (
                  <ItemSlot
                    key={r.id}
                    icon={r.icon}
                    label={r.name}
                    selected={rigId === r.id}
                    locked={!s.owned.includes(r.id)}
                    equipped={s.owned.includes(r.id)}
                    price={
                      s.owned.includes(r.id)
                        ? undefined
                        : { amount: r.price, currency: r.currency }
                    }
                    onClick={() => setRigId(r.id)}
                    ariaLabel={`${r.name}, ${r.price} ${r.currency}`}
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
              {tab === 'stash' ? 'One use' : SLOT_LABEL[(active as RigDef).slot]}
            </span>
          }
          pad="md"
          rivets
        >
          <p className="t-body detail__desc">{active.desc}</p>

          {tab === 'stash' ? (
            <ul className="detail__gains">
              {STAT_ORDER.filter((k) => typeof supply.gain[k] === 'number').map((k) => {
                const v = supply.gain[k]!
                // Heat reads backwards: less of it is the good outcome
                const good = STATS[k].inverted ? v < 0 : v > 0
                return (
                  <li key={k} className={good ? 'is-up' : 'is-down'}>
                    <PixelIcon name={STATS[k].icon} size={12} />
                    <span>{STATS[k].label}</span>
                    <b>
                      {v > 0 ? '+' : ''}
                      {v}
                    </b>
                  </li>
                )
              })}
            </ul>
          ) : (
            <ul className="detail__gains">
              {Object.entries((active as RigDef).bonus ?? {}).map(([key, value]) => {
                const meta = RIG_BONUS_TEXT[key as keyof RigBonus]
                return (
                  <li key={key} className="is-up">
                    <PixelIcon name={meta.icon} size={12} />
                    <span>{meta.label}</span>
                    <b>{meta.value(value)}</b>
                  </li>
                )
              })}
            </ul>
          )}

          <PixelButton
            label={owned ? 'Already owned' : affordable ? 'Buy' : 'Cannot afford'}
            icon={active.currency === 'bankroll' ? 'coin' : 'shard'}
            variant={owned ? 'ghost' : 'gold'}
            size="lg"
            full
            disabled={owned || !affordable}
            price={owned ? undefined : { amount: active.price, currency: active.currency }}
            onClick={buy}
          />

          {tab === 'stash' ? (
            <p className="t-label t-dim t-center screen__foot">
              On the desk: {s.stash[supply.id] ?? 0}
            </p>
          ) : null}
        </PixelPanel>

        <p className="t-label t-dim t-center screen__foot">
          {WORLD.cashName} moves on fills and fees. {WORLD.creditName} come from showing up.
          <br />
          {WORLD.disclaimer}
        </p>
      </div>
    </div>
  )
}
