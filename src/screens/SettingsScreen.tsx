import { useState } from 'react'
import { Modal } from '../components/Modal'
import { PixelButton } from '../components/PixelButton'
import { PixelIcon } from '../components/PixelIcon'
import { PixelPanel } from '../components/PixelPanel'
import { ScreenHeader } from '../components/ScreenHeader'
import { resetGame, saveNow, setScreen, toggleSetting } from '../game/actions'
import { GAME_VERSION, WORLD } from '../game/config'
import { useGameState } from '../game/store'
import { formatAway } from '../game/util'
import { closeApp, isTelegram, telegramInfo } from '../telegram/telegram'
import type { IconName } from '../components/PixelIcon'

/* ==========================================================================
   Keep — settings, tally, and the one destructive button.
   ========================================================================== */

const TOGGLES: { key: 'sound' | 'haptics' | 'reduceMotion'; label: string; icon: IconName; note: string }[] =
  [
    { key: 'sound', label: 'Sound', icon: 'flame', note: 'Short pixel blips. No music.' },
    { key: 'haptics', label: 'Rumble', icon: 'bolt', note: 'Telegram haptics on each action.' },
    {
      key: 'reduceMotion',
      label: 'Still Hall',
      icon: 'gear',
      note: 'Freezes fire, dust and shake.',
    },
  ]

export function SettingsScreen() {
  const s = useGameState()
  const [confirming, setConfirming] = useState(false)
  const tg = telegramInfo()
  const daysHeld = Math.max(1, Math.floor((Date.now() - s.firstVisit) / 86_400_000) + 1)

  return (
    <div className="screen">
      <ScreenHeader title="The Keep" showCurrency={false} />

      <div className="screen__body">
        <PixelPanel variant="darkwood" title="Comforts" titleIcon="gear" pad="sm" rivets>
          <ul className="toggles">
            {TOGGLES.map((t) => {
              const on = s.settings[t.key]
              return (
                <li key={t.key}>
                  <button
                    type="button"
                    className={`toggle ${on ? 'is-on' : ''}`}
                    onClick={() => toggleSetting(t.key)}
                    aria-pressed={on}
                  >
                    <PixelIcon name={t.icon} size={14} />
                    <span className="toggle__text">
                      <b>{t.label}</b>
                      <small>{t.note}</small>
                    </span>
                    <span className="toggle__switch">
                      <span className="toggle__knob" />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
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
            Last seen {s.awayMs > 60_000 ? `${formatAway(s.awayMs)} ago` : 'just now'}. Progress
            saves itself.
          </p>
        </PixelPanel>

        <PixelPanel variant="ink" title="Hall" titleIcon="torch" pad="md" rivets>
          <div className="stack">
            <PixelButton
              label="Save now"
              icon="check"
              variant="wood"
              size="sm"
              full
              onClick={saveNow}
            />
            <PixelButton
              label="Back to the Hall"
              icon="arrowLeft"
              variant="wood"
              size="sm"
              full
              onClick={() => setScreen('room')}
            />
            {isTelegram() ? (
              <PixelButton
                label="Close"
                icon="close"
                variant="ghost"
                size="sm"
                full
                onClick={closeApp}
              />
            ) : null}
            <PixelButton
              label="Abandon the post"
              icon="skull"
              variant="danger"
              size="sm"
              full
              sublabel="Wipes everything"
              onClick={() => setConfirming(true)}
            />
          </div>
        </PixelPanel>

        <p className="t-label t-dim t-center screen__foot">
          {WORLD.title} v{GAME_VERSION}
          {tg ? ` · Telegram ${tg.platform} ${tg.version}` : ' · browser'}
        </p>
        <p className="t-label t-dim t-center screen__foot">
          An original game. No combat, no wallets, no chain.
        </p>
      </div>

      <Modal
        open={confirming}
        title="Abandon the post?"
        confirmLabel="Wipe it"
        cancelLabel="Keep it"
        danger
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          resetGame()
          setConfirming(false)
          setScreen('room')
        }}
      >
        Everything goes: the tally, the coin, the regalia. He will not remember you, which is
        arguably a mercy.
      </Modal>
    </div>
  )
}

function Row({ label, value, icon }: { label: string; value: number; icon: IconName }) {
  return (
    <li>
      <PixelIcon name={icon} size={12} />
      <span>{label}</span>
      <b>{value}</b>
    </li>
  )
}
