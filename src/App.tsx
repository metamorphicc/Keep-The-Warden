import { useEffect } from 'react'
import { saveNow } from './game/actions'
import { tick, useGame } from './game/store'
import { BootScreen } from './screens/BootScreen'
import { FeedScreen } from './screens/FeedScreen'
import { RoomScreen } from './screens/RoomScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { ShopScreen } from './screens/ShopScreen'
import { TrainScreen } from './screens/TrainScreen'
import { WardrobeScreen } from './screens/WardrobeScreen'
import { initTelegram } from './telegram/telegram'

/* ==========================================================================
   App shell: Telegram handshake, the one-second game clock, and the router.
   ========================================================================== */

export function App() {
  const screen = useGame((s) => s.screen)
  const reduceMotion = useGame((s) => s.settings.reduceMotion)

  // Telegram handshake, once
  useEffect(() => {
    initTelegram()
  }, [])

  // game clock: decay, activity expiry, cooldown countdowns
  useEffect(() => {
    tick()
    const id = window.setInterval(() => tick(), 1000)
    return () => window.clearInterval(id)
  }, [])

  // catch up immediately when the WebView comes back, and flush the save
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
      else saveNow()
    }
    const onHide = () => saveNow()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('pagehide', onHide)
    }
  }, [])

  useEffect(() => {
    document.body.classList.toggle('reduce-motion', reduceMotion)
  }, [reduceMotion])

  return (
    <div className="app">
      <div className="scanlines" aria-hidden="true" />
      {screen === 'boot' ? <BootScreen /> : null}
      {screen === 'room' ? <RoomScreen /> : null}
      {screen === 'feed' ? <FeedScreen /> : null}
      {screen === 'wardrobe' ? <WardrobeScreen /> : null}
      {screen === 'train' ? <TrainScreen /> : null}
      {screen === 'shop' ? <ShopScreen /> : null}
      {screen === 'settings' ? <SettingsScreen /> : null}
    </div>
  )
}
