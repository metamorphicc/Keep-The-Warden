/* ==========================================================================
   Telegram Stars cosmetic checkout

   Creates a Telegram Stars invoice link for a cosmetic product.

   Vercel Environment Variables:

     BOT_TOKEN      required. From @BotFather. Same token used by api/telegram.
   ========================================================================== */

interface Req {
  method?: string
  body?: unknown
}
interface Res {
  status: (code: number) => Res
  json: (body: unknown) => void
  end: (body?: string) => void
}

declare const process: { env: Record<string, string | undefined> }

const PRODUCTS: Record<string, { name: string; desc: string; priceStars: number }> = {
  cos_outfit_founder_hoodie: {
    name: 'Founder Hoodie',
    desc: 'Cosmetic outfit. No gameplay power.',
    priceStars: 149,
  },
  cos_desk_carbon: {
    name: 'Carbon Desk',
    desc: 'Cosmetic desk skin. No gameplay power.',
    priceStars: 199,
  },
  cos_monitor_ultrawide: {
    name: 'Ultrawide Monitor',
    desc: 'Cosmetic monitor upgrade. No gameplay power.',
    priceStars: 249,
  },
  cos_tool_founder_mug: {
    name: 'Founder Mug',
    desc: 'Cosmetic desk prop. No gameplay power.',
    priceStars: 99,
  },
  cos_room_city_loft: {
    name: 'City Loft Skin',
    desc: 'Cosmetic room skin. No gameplay power.',
    priceStars: 349,
  },
  cos_room_neon_quant: {
    name: 'Neon Quant Sign',
    desc: 'Cosmetic room sign. No gameplay power.',
    priceStars: 499,
  },
}

function parseBody(body: unknown): Record<string, unknown> {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
}

async function callBot(token: string, method: string, payload: Record<string, unknown>): Promise<unknown> {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = (await response.json()) as { ok?: boolean; result?: unknown; description?: string }
  if (!response.ok || !data.ok) {
    throw new Error(data.description ?? `Telegram ${method} failed.`)
  }
  return data.result
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'POST') {
    res.status(200).json({
      ok: true,
      what: 'Quantum Pit Telegram Stars checkout',
      configured: Boolean(process.env.BOT_TOKEN),
    })
    return
  }

  const token = process.env.BOT_TOKEN
  if (!token) {
    res.status(500).json({ error: 'BOT_TOKEN is not configured.' })
    return
  }

  const body = parseBody(req.body)
  const productId = typeof body.productId === 'string' ? body.productId : ''
  const product = PRODUCTS[productId]
  if (!product) {
    res.status(400).json({ error: 'Unknown cosmetic product.' })
    return
  }

  try {
    const payload = JSON.stringify({
      productId,
      kind: 'cosmetic',
      t: Date.now(),
    })
    const invoiceUrl = await callBot(token, 'createInvoiceLink', {
      title: product.name,
      description: product.desc,
      payload,
      provider_token: '',
      currency: 'XTR',
      prices: [{ label: product.name, amount: product.priceStars }],
    })

    res.status(200).json({ invoiceUrl })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create invoice.'
    res.status(502).json({ error: message })
  }
}
