/* ==========================================================================
   Telegram WebApp wrapper
   Everything is optional-chained: the app must also run in a plain browser
   (that is how you develop it) and inside older Telegram clients.
   ========================================================================== */

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'
export type HapticNotification = 'error' | 'success' | 'warning'

interface SafeAreaInset {
  top: number
  bottom: number
  left: number
  right: number
}

interface TelegramWebApp {
  initData: string
  initDataUnsafe?: { user?: { id: number; first_name?: string; username?: string } }
  version: string
  platform: string
  colorScheme: 'light' | 'dark'
  viewportHeight: number
  viewportStableHeight: number
  isExpanded: boolean
  safeAreaInset?: SafeAreaInset
  contentSafeAreaInset?: SafeAreaInset
  ready: () => void
  expand: () => void
  close: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  setBottomBarColor?: (color: string) => void
  enableClosingConfirmation?: () => void
  disableVerticalSwipes?: () => void
  onEvent: (event: string, cb: (...args: unknown[]) => void) => void
  offEvent: (event: string, cb: (...args: unknown[]) => void) => void
  BackButton?: {
    isVisible: boolean
    show: () => void
    hide: () => void
    onClick: (cb: () => void) => void
    offClick: (cb: () => void) => void
  }
  HapticFeedback?: {
    impactOccurred: (style: HapticStyle) => void
    notificationOccurred: (type: HapticNotification) => void
    selectionChanged: () => void
  }
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp }
  }
}

function wa(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp
}

export const isTelegram = (): boolean => Boolean(wa()?.initData !== undefined && wa()?.platform !== undefined)

export function tgUserName(): string | null {
  return wa()?.initDataUnsafe?.user?.first_name ?? null
}

/** Compare "7.7" style versions. */
function versionAtLeast(target: string): boolean {
  const cur = wa()?.version
  if (!cur) return false
  const a = cur.split('.').map(Number)
  const b = target.split('.').map(Number)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x !== y) return x > y
  }
  return true
}

const BG = '#120c08'

/* --------------------------------------------------------------------------
   Layout: expose Telegram's viewport + insets as CSS variables so the
   stylesheet can stay declarative.
   -------------------------------------------------------------------------- */

function applyViewport(): void {
  const app = wa()
  const root = document.documentElement
  const h = app?.viewportStableHeight
  if (h && h > 0) {
    root.style.setProperty('--app-h', `${Math.round(h)}px`)
  } else {
    root.style.setProperty('--app-h', '100dvh')
  }

  // Telegram 8.0+ reports device + content safe areas. Take the larger of the
  // two for the top (that is where the drag handle / status bar sits).
  const sa = app?.safeAreaInset
  const csa = app?.contentSafeAreaInset
  if (sa || csa) {
    const top = Math.max(sa?.top ?? 0, csa?.top ?? 0)
    const bottom = Math.max(sa?.bottom ?? 0, csa?.bottom ?? 0)
    const left = Math.max(sa?.left ?? 0, csa?.left ?? 0)
    const right = Math.max(sa?.right ?? 0, csa?.right ?? 0)
    root.style.setProperty('--sa-top', `${top}px`)
    root.style.setProperty('--sa-bottom', `${bottom}px`)
    root.style.setProperty('--sa-left', `${left}px`)
    root.style.setProperty('--sa-right', `${right}px`)
  }
}

let initialised = false

export function initTelegram(): void {
  if (initialised) return
  initialised = true

  const app = wa()

  // Always apply the fallback viewport height, Telegram or not.
  applyViewport()
  window.addEventListener('resize', applyViewport)
  window.addEventListener('orientationchange', applyViewport)

  if (!app) return

  try {
    app.ready()
    app.expand()
    // Colour setters landed in Bot API 6.1; the bottom bar only in 7.10. The
    // SDK logs a warning if you call them on an older client, so gate them.
    if (versionAtLeast('6.1')) {
      app.setHeaderColor?.(BG)
      app.setBackgroundColor?.(BG)
    }
    if (versionAtLeast('7.10')) app.setBottomBarColor?.(BG)
    // Stops the "pull down to close" gesture from fighting with taps on the
    // character. Available from Bot API 7.7.
    if (versionAtLeast('7.7')) app.disableVerticalSwipes?.()

    app.onEvent('viewportChanged', applyViewport)
    app.onEvent('safeAreaChanged', applyViewport)
    app.onEvent('contentSafeAreaChanged', applyViewport)
  } catch {
    /* older client — degrade quietly */
  }
}

/* --------------------------------------------------------------------------
   Back button — driven by the screen stack. Bot API 6.1+.
   -------------------------------------------------------------------------- */

let backHandler: (() => void) | null = null

export function setBackButton(handler: (() => void) | null): void {
  const bb = wa()?.BackButton
  if (!bb || !versionAtLeast('6.1')) return
  if (backHandler) {
    bb.offClick(backHandler)
    backHandler = null
  }
  if (handler) {
    backHandler = handler
    bb.onClick(backHandler)
    bb.show()
  } else {
    bb.hide()
  }
}

/* --------------------------------------------------------------------------
   Haptics — Bot API 6.1+, gated on the player's setting by the caller
   -------------------------------------------------------------------------- */

/** The SDK warns on every call in older clients, so check the version first. */
function haptics(): TelegramWebApp['HapticFeedback'] | undefined {
  if (!versionAtLeast('6.1')) return undefined
  return wa()?.HapticFeedback
}

export function haptic(style: HapticStyle = 'light'): void {
  try {
    haptics()?.impactOccurred(style)
  } catch {
    /* ignore */
  }
}

export function hapticNotify(type: HapticNotification): void {
  try {
    haptics()?.notificationOccurred(type)
  } catch {
    /* ignore */
  }
}

export function hapticSelect(): void {
  try {
    haptics()?.selectionChanged()
  } catch {
    /* ignore */
  }
}

export function closeApp(): void {
  try {
    wa()?.close()
  } catch {
    /* ignore */
  }
}

export function telegramInfo(): { platform: string; version: string } | null {
  const app = wa()
  if (!app) return null
  return { platform: app.platform, version: app.version }
}
