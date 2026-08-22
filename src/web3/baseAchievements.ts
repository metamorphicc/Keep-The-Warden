import type { AchievementDef } from '../game/types'
import { baseProvider, ensureBaseChain } from './baseAccount'

type Env = Record<string, string | undefined>

function env(): Env {
  return (import.meta as ImportMeta & { env: Env }).env
}

export function badgeContractAddress(): string | null {
  const address = env().VITE_QP_BADGE_CONTRACT_ADDRESS
  return address && /^0x[a-fA-F0-9]{40}$/.test(address) ? address : null
}

export function badgeClaimEndpoint(): string | null {
  return env().VITE_QP_BADGE_CLAIM_URL ?? null
}

export function badgeClaimConfigured(): boolean {
  return badgeContractAddress() !== null && badgeClaimEndpoint() !== null
}

interface ClaimPayload {
  to?: string
  data?: string
  value?: string
}

export async function claimBaseAchievementBadge(
  achievement: AchievementDef,
  walletAddress: string,
): Promise<string> {
  const contract = badgeContractAddress()
  const endpoint = badgeClaimEndpoint()
  if (!contract) throw new Error('Badge contract is not configured yet.')
  if (!endpoint) throw new Error('Claim signer endpoint is not configured yet.')

  await ensureBaseChain()
  const eth = baseProvider()
  if (!eth) throw new Error('No wallet found. Open in Base App or connect Base Account first.')

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      achievementId: achievement.id,
      tokenId: achievement.tokenId,
      walletAddress,
    }),
  })

  if (!response.ok) {
    throw new Error(`Claim signer rejected the badge (${response.status}).`)
  }

  const payload = (await response.json()) as ClaimPayload
  if (!payload.data || typeof payload.data !== 'string') {
    throw new Error('Claim signer did not return transaction data.')
  }

  const tx = await eth.request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: walletAddress,
        to: payload.to ?? contract,
        data: payload.data,
        value: payload.value ?? '0x0',
      },
    ],
  })

  if (typeof tx !== 'string') throw new Error('Wallet did not return a transaction hash.')
  return tx
}
