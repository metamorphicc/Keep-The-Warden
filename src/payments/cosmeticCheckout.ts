import type {
  CosmeticDef,
  DonationPaymentProvider,
  GameState,
  LoginMethod,
} from '../game/types'
import { openTelegramExternalLink, openTelegramInvoice, tgInitData } from '../telegram/telegram'
import { baseProvider, ensureBaseChain } from '../web3/baseAccount'

type Env = Record<string, string | undefined>

interface TxPayload {
  to?: string
  data?: string
  value?: string
}

interface InvoicePayload {
  invoiceUrl?: string
  url?: string
  status?: string
  receipt?: string
}

export interface CosmeticReceipt {
  provider: DonationPaymentProvider
  id: string
}

function env(): Env {
  return (import.meta as ImportMeta & { env: Env }).env
}

export function providerLabel(provider: DonationPaymentProvider): string {
  switch (provider) {
    case 'base':
      return 'Base'
    case 'telegram-stars':
      return 'Stars'
    case 'ton':
      return 'TON'
  }
}

export function providersForLogin(method: LoginMethod | null): DonationPaymentProvider[] {
  if (method === 'base') return ['base']
  if (method === 'telegram') return ['telegram-stars', 'ton']
  return []
}

function checkoutBody(cosmetic: CosmeticDef, state: GameState): string {
  return JSON.stringify({
    productId: cosmetic.id,
    productName: cosmetic.name,
    priceUsd: cosmetic.priceUsd,
    priceStars: cosmetic.priceStars,
    loginMethod: state.loginMethod,
    walletAddress: state.walletAddress,
    telegramInitData: state.loginMethod === 'telegram' ? tgInitData() : null,
  })
}

async function postJson<T>(url: string, cosmetic: CosmeticDef, state: GameState): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: checkoutBody(cosmetic, state),
  })
  if (!response.ok) throw new Error(`Checkout rejected (${response.status}).`)
  return (await response.json()) as T
}

async function payWithBase(cosmetic: CosmeticDef, state: GameState): Promise<CosmeticReceipt> {
  if (!state.walletAddress) throw new Error('Connect Base Account before buying cosmetics.')
  const endpoint = env().VITE_QP_BASE_COSMETIC_CHECKOUT_URL
  if (!endpoint) throw new Error('Base cosmetic checkout endpoint is not configured.')

  await ensureBaseChain()
  const eth = baseProvider()
  if (!eth) throw new Error('No wallet found. Open in Base App or connect Base Account first.')

  const payload = await postJson<TxPayload>(endpoint, cosmetic, state)
  if (!payload.data || typeof payload.data !== 'string') {
    throw new Error('Checkout did not return transaction data.')
  }

  const tx = await eth.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: state.walletAddress,
        to: payload.to,
        data: payload.data,
        value: payload.value ?? '0x0',
      },
    ],
  })

  if (typeof tx !== 'string') throw new Error('Wallet did not return a transaction hash.')
  return { provider: 'base', id: tx }
}

async function payWithStars(cosmetic: CosmeticDef, state: GameState): Promise<CosmeticReceipt> {
  const endpoint = env().VITE_QP_TELEGRAM_STARS_CHECKOUT_URL
  if (!endpoint) throw new Error('Telegram Stars checkout endpoint is not configured.')

  const payload = await postJson<InvoicePayload>(endpoint, cosmetic, state)
  const invoiceUrl = payload.invoiceUrl ?? payload.url
  if (!invoiceUrl) throw new Error('Checkout did not return a Telegram invoice URL.')

  const status = await openTelegramInvoice(invoiceUrl)
  if (status !== 'paid') throw new Error(`Telegram invoice closed as ${status}.`)
  return { provider: 'telegram-stars', id: payload.receipt ?? `stars:${cosmetic.id}:${Date.now()}` }
}

async function payWithTon(cosmetic: CosmeticDef, state: GameState): Promise<CosmeticReceipt> {
  const endpoint = env().VITE_QP_TON_CHECKOUT_URL
  if (!endpoint) throw new Error('TON checkout endpoint is not configured.')

  const payload = await postJson<InvoicePayload>(endpoint, cosmetic, state)
  if (payload.status === 'paid') {
    return { provider: 'ton', id: payload.receipt ?? `ton:${cosmetic.id}:${Date.now()}` }
  }
  if (payload.url) {
    openTelegramExternalLink(payload.url)
    throw new Error('Finish the TON payment. The item unlocks after the checkout confirms it.')
  }
  throw new Error('TON checkout did not return a payment URL.')
}

export async function payForCosmetic(
  cosmetic: CosmeticDef,
  state: GameState,
  provider: DonationPaymentProvider,
): Promise<CosmeticReceipt> {
  if (provider === 'base') return payWithBase(cosmetic, state)
  if (provider === 'telegram-stars') return payWithStars(cosmetic, state)
  return payWithTon(cosmetic, state)
}
