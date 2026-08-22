/* ==========================================================================
   Base cosmetic checkout

   Returns a prepared USDC-on-Base transfer transaction. The browser asks the
   connected Base Account to send it; this function never sees private keys.

   Vercel Environment Variables:

     BASE_COSMETIC_TREASURY_ADDRESS   required. Your Base wallet address that
                                      receives cosmetic payments.
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

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'
const TRANSFER_SELECTOR = 'a9059cbb'

const PRODUCTS: Record<string, { name: string; priceUsd: number }> = {
  cos_outfit_founder_hoodie: { name: 'Founder Hoodie', priceUsd: 2.99 },
  cos_desk_carbon: { name: 'Carbon Desk', priceUsd: 3.99 },
  cos_monitor_ultrawide: { name: 'Ultrawide Monitor', priceUsd: 4.99 },
  cos_tool_founder_mug: { name: 'Founder Mug', priceUsd: 1.99 },
  cos_room_city_loft: { name: 'City Loft Skin', priceUsd: 6.99 },
  cos_room_neon_quant: { name: 'Neon Quant Sign', priceUsd: 9.99 },
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

function cleanAddress(address: string): string | null {
  return /^0x[a-fA-F0-9]{40}$/.test(address) ? address : null
}

function uint256Hex(value: bigint): string {
  return value.toString(16).padStart(64, '0')
}

function addressArg(address: string): string {
  return address.toLowerCase().replace(/^0x/, '').padStart(64, '0')
}

function usdcUnits(priceUsd: number): bigint {
  return BigInt(Math.round(priceUsd * 1_000_000))
}

export default async function handler(req: Req, res: Res): Promise<void> {
  if (req.method !== 'POST') {
    res.status(200).json({
      ok: true,
      what: 'Quantum Pit Base cosmetic checkout',
      configured: Boolean(cleanAddress(process.env.BASE_COSMETIC_TREASURY_ADDRESS ?? '')),
      token: BASE_USDC,
    })
    return
  }

  const treasury = cleanAddress(process.env.BASE_COSMETIC_TREASURY_ADDRESS ?? '')
  if (!treasury) {
    res.status(500).json({ error: 'BASE_COSMETIC_TREASURY_ADDRESS is not configured.' })
    return
  }

  const body = parseBody(req.body)
  const productId = typeof body.productId === 'string' ? body.productId : ''
  const product = PRODUCTS[productId]
  if (!product) {
    res.status(400).json({ error: 'Unknown cosmetic product.' })
    return
  }

  const amount = usdcUnits(product.priceUsd)
  const data = `0x${TRANSFER_SELECTOR}${addressArg(treasury)}${uint256Hex(amount)}`

  res.status(200).json({
    productId,
    productName: product.name,
    token: BASE_USDC,
    to: BASE_USDC,
    data,
    value: '0x0',
    amount: amount.toString(),
    currency: 'USDC',
  })
}
