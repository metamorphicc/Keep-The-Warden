import { useState } from 'react'
import { Modal } from '../components/Modal'
import { PixelBar } from '../components/PixelBar'
import { PixelButton } from '../components/PixelButton'
import { PixelIcon, type IconName } from '../components/PixelIcon'
import { PixelPanel } from '../components/PixelPanel'
import { ScreenHeader } from '../components/ScreenHeader'
import { WardenPlinth } from '../components/WardenPlinth'
import { renameWarden, setScreen } from '../game/actions'
import {
  COSMETIC_BY_ID,
  NAME_MAX,
  NEEDS,
  NEED_LOW,
  NEED_ORDER,
  SLOT_LABEL,
  WORLD,
} from '../game/config'
import { overallMood, useGameState } from '../game/store'
import type { EquipSlot } from '../game/types'
import { formatAway } from '../game/util'
import { cloudAvailable, tgUserId, tgUserName, tgUsername } from '../telegram/telegram'

/* ==========================================================================
   Service record — who he is, how he is, and everything he has done.
   Also the only place his name can be changed.
   ========================================================================== */

const SLOTS: EquipSlot[] = ['head', 'cloak', 'blade']

export function ProfileScreen() {
  const s = useGameState()
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(s.name)

  const daysHeld = Math.max(1, Math.floor((Date.now() - s.firstVisit) / 86_400_000) + 1)
  const mood = Math.round(overallMood(s.needs))
  const synced = cloudAvailable()
  // A Telegram account id is what namespaces the save. No id means we are in a
  // plain browser (or a client that hides the user), whatever the SDK claims.
  const linked = tgUserId() !== null

  const keeper = (() => {
    const first = tgUserName()
    const handle = tgUsername()
    if (first && handle) return `${first} (@${handle})`
    if (first) return first
    if (handle) return `@${handle}`
    return linked ? 'Unnamed keeper' : 'Local guest'
  })()

  const syncNote = synced
    ? 'Held against your Telegram account, so he turns up on any device you sign into.'
    : linked
      ? 'This Telegram client is too old for account storage. He lives on this device only.'
      : 'Browser session. He lives in this browser only — open the app inside Telegram to carry him around.'

  function openRename(): void {
    setDraft(s.name)
    setRenaming(true)
  }

  function commitRename(): void {
    renameWarden(draft)
    setRenaming(false)
  }

  return (
    <div className="screen">
      <ScreenHeader title="Service Record" />

      <div className="screen__body">
        <PixelPanel variant="ink" pad="none" rivets>
          <div className="profile__hero">
            <WardenPlinth width={156} height={108} className="profile__canvas" />
            <div className="profile__plate">
              <span className="profile__name t-gold">{s.name}</span>
              <span className="t-label t-dim">
                {s.name === WORLD.hero
                  ? `Warden of ${WORLD.hall} · Day ${daysHeld}`
                  : `Roster says ${WORLD.hero} · Day ${daysHeld}`}
              </span>
              <PixelButton
                label="Rename him"
                icon="star"
                variant="wood"
                size="sm"
                onClick={openRename}
              />
            </div>
          </div>
        </PixelPanel>

        <PixelPanel
          variant="darkwood"
          title="Condition"
          titleIcon="flame"
          pad="sm"
          rivets
          titleRight={<span className="t-label t-dim">{mood}%</span>}
        >
          <div className="profile__bars">
            {NEED_ORDER.map((key) => {
              const meta = NEEDS[key]
              const value = s.needs[key]
              return (
                <PixelBar
                  key={key}
                  label={meta.label}
                  icon={meta.icon}
                  value={value}
                  color={meta.color}
                  colorDark={meta.colorDark}
                  low={value < NEED_LOW}
                  showValue
                />
              )
            })}
          </div>
          <p className="t-label t-dim">
            {mood >= 70
              ? 'Holding the line. He would never say so.'
              : mood >= 40
                ? 'Managing. Barely a compliment.'
                : 'Something down there needs seeing to.'}
          </p>
        </PixelPanel>

        <PixelPanel variant="wood" title="Keeper" titleIcon="warden" pad="md" rivets>
          <ul className="detail__gains detail__gains--text">
            <Row label="Keeper" value={keeper} icon="warden" />
            <Row label="Save" value={synced ? 'Telegram account' : 'This device'} icon={synced ? 'check' : 'lock'} />
            <Row
              label="Last seen"
              value={s.awayMs > 60_000 ? `${formatAway(s.awayMs)} ago` : 'just now'}
              icon="torch"
            />
          </ul>
          <p className="t-label t-dim">{syncNote}</p>
        </PixelPanel>

        <PixelPanel variant="darkwood" title="Regalia" titleIcon="helm" pad="md" rivets>
          <ul className="detail__gains detail__gains--text">
            {SLOTS.map((slot) => {
              const id = s.look[slot]
              const item = id ? COSMETIC_BY_ID[id] : undefined
              return (
                <Row
                  key={slot}
                  label={SLOT_LABEL[slot]}
                  value={item?.name ?? 'Nothing'}
                  icon={item?.icon ?? 'lock'}
                />
              )
            })}
          </ul>
          <PixelButton
            label="Change regalia"
            icon="helm"
            variant="ghost"
            size="sm"
            full
            onClick={() => setScreen('wardrobe')}
          />
        </PixelPanel>

        <PixelPanel variant="wood" title="Tally" titleIcon="star" pad="md" rivets>
          <ul className="detail__gains tally">
            <Row label="Days on post" value={daysHeld} icon="torch" />
            <Row label="Times greeted" value={s.stats.pets} icon="star" />
            <Row label="Meals served" value={s.stats.meals} icon="stew" />
            <Row label="Naps taken" value={s.stats.naps} icon="bed" />
            <Row label="Armour scrubbed" value={s.stats.washes} icon="brush" />
            <Row label="Rounds trained" value={s.stats.trains} icon="dummy" />
            <Row label="Longest chain" value={s.stats.bestCombo} icon="sword" />
            <Row label="Visits" value={s.visits} icon="check" />
          </ul>
          <p className="t-label t-dim">
            {WORLD.coinName} {s.coins} · {WORLD.shardName} {s.shards}. Progress saves itself.
          </p>
        </PixelPanel>

        <PixelButton
          label="Back to the Hall"
          icon="arrowLeft"
          variant="wood"
          size="sm"
          full
          onClick={() => setScreen('room')}
        />
      </div>

      <Modal
        open={renaming}
        title="What do you call him?"
        confirmLabel="Carve it in"
        cancelLabel="Leave it"
        onCancel={() => setRenaming(false)}
        onConfirm={commitRename}
      >
        <p className="profile__hint">
          Letters, digits, spaces and the odd apostrophe. Up to {NAME_MAX} characters. Leave it
          empty and he goes back to the name on the roster.
        </p>
        <input
          className="field"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitRename()
          }}
          maxLength={NAME_MAX}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="words"
          autoFocus
          aria-label="The warden's name"
        />
        <div className="profile__hint-row">
          <span className="t-label t-dim">
            {draft.length}/{NAME_MAX}
          </span>
          <button type="button" className="linkbtn" onClick={() => setDraft(WORLD.hero)}>
            Use the roster name
          </button>
        </div>
      </Modal>
    </div>
  )
}

function Row({
  label,
  value,
  icon,
}: {
  label: string
  value: string | number
  icon: IconName
}) {
  return (
    <li>
      <PixelIcon name={icon} size={12} />
      <span>{label}</span>
      <b>{value}</b>
    </li>
  )
}
