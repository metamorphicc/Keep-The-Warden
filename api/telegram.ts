/* ==========================================================================
   Telegram bot webhook — the only server-side code in this project.

   It exists for one reason: somebody types /start in the chat and should get
   an answer instead of silence. Everything else about the game is client-side.

   Runs as a Vercel Function (see the `api/` convention). It is a stub on
   purpose: no database, no state, no user tracking. Each request is answered
   and forgotten.

   Environment variables (Vercel → Project → Settings → Environment Variables):

     BOT_TOKEN          required. From @BotFather.
     WEBHOOK_SECRET     optional but recommended. Same value you pass as
                        `secret_token` when registering the webhook; requests
                        without it are rejected.
     APP_URL            optional. Public URL of the Mini App. Falls back to the
                        deployment's own production URL.
     START_IMAGE_URL    optional. Absolute URL of the /start picture. Defaults
                        to `<APP_URL>/start-banner.png`.
   ========================================================================== */

/** Minimal shape of the Vercel Node request/response — avoids a dependency. */
interface Req {
  method?: string
  headers: Record<string, string | string[] | undefined>
  body?: unknown
}
interface Res {
  status: (code: number) => Res
  json: (body: unknown) => void
  end: (body?: string) => void
}

declare const process: { env: Record<string, string | undefined> }

/* --------------------------------------------------------------------------
   Copy. Dry, like the rest of the game. HTML parse mode.
   -------------------------------------------------------------------------- */

const CAPTION = [
  '<b>KEEP THE WARDEN</b>',
  '',
  'He held the lower gate of Emberhold for forty winters. Nothing comes through it any more, and nobody sent word that he could leave.',
  '',
  'So he sweeps. He eats stew. He hits a straw dummy to stay honest.',
  '',
  'Your job is smaller than his: keep him fed, rested, clean and in reasonable spirits. Tap him when he sulks. He will pretend not to need it.',
  '',
  '<i>No combat. No wallet. No chain. Just an old man and five bars that keep falling.</i>',
].join('\n')

const NUDGE =
  'The hall is through the button below. He does not read messages — he is busy standing near a door.'

const BUTTON_TEXT = '→  Enter the Deep Hall  ←'

/* -------------------------------------------------------------------------- */

function appUrl(): string {
  const explicit = process.env.APP_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  // Vercel exposes the stable production hostname to the function at runtime.
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? ''
  return host ? `https://${host.replace(/\/+$/, '')}` : ''
}

function imageUrl(): string {
  const explicit = process.env.START_IMAGE_URL
  if (explicit) return explicit
  const base = appUrl()
  return base ? `${base}/start-banner.png` : ''
}

function keyboard(): unknown {
  const url = appUrl()
  // A web_app button needs an https URL. Without one, fall back to no keyboard
  // rather than sending Telegram something it will reject.
  if (!url.startsWith('https://')) return undefined
  return { inline_keyboard: [[{ text: BUTTON_TEXT, web_app: { url } }]] }
}

async function callBot(method: string, payload: Record<string, unknown>): Promise<boolean> {
  const token = process.env.BOT_TOKEN
  if (!token) return false
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return r.ok
  } catch {
    return false
  }
}

/** Photo + caption, with a text-only fallback if the image cannot be fetched. */
async function sendIntro(chatId: number): Promise<void> {
  const markup = keyboard()
  const photo = imageUrl()

  if (photo) {
    const ok = await callBot('sendPhoto', {
      chat_id: chatId,
      photo,
      caption: CAPTION,
      parse_mode: 'HTML',
      reply_markup: markup,
    })
    if (ok) return
    // Telegram could not fetch the image (bad URL, not deployed yet, 404).
    // Sending the words is better than sending nothing.
  }

  await callBot('sendMessage', {
    chat_id: chatId,
    text: CAPTION,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    reply_markup: markup,
  })
}

function header(req: Req, name: string): string {
  const v = req.headers[name] ?? req.headers[name.toLowerCase()]
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
}

function parseBody(body: unknown): Record<string, any> | null {
  if (!body) return null
  if (typeof body === 'string') {
    try {
      return JSON.parse(body)
    } catch {
      return null
    }
  }
  return typeof body === 'object' ? (body as Record<string, any>) : null
}

export default async function handler(req: Req, res: Res): Promise<void> {
  // A GET is handy for eyeballing that the function deployed at all.
  if (req.method !== 'POST') {
    res.status(200).json({
      ok: true,
      what: 'Keep The Warden bot webhook',
      configured: Boolean(process.env.BOT_TOKEN),
      app: appUrl() || null,
    })
    return
  }

  const secret = process.env.WEBHOOK_SECRET
  if (secret && header(req, 'x-telegram-bot-api-secret-token') !== secret) {
    res.status(401).end()
    return
  }

  const update = parseBody(req.body)
  const message = update?.message ?? update?.edited_message
  const chatId: unknown = message?.chat?.id
  const text: string = typeof message?.text === 'string' ? message.text : ''

  // Always 200, always fast: a non-2xx makes Telegram retry the same update.
  if (typeof chatId !== 'number') {
    res.status(200).end()
    return
  }

  const command = text.trim().split(/\s+/)[0]?.split('@')[0]?.toLowerCase() ?? ''

  if (command === '/start' || command === '/help' || command === '/play') {
    await sendIntro(chatId)
  } else if (text) {
    await callBot('sendMessage', {
      chat_id: chatId,
      text: NUDGE,
      reply_markup: keyboard(),
    })
  }

  res.status(200).end()
}
