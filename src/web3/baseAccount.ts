export interface BaseAccountConnection {
  address: string
  chainId: string | null
}

interface EthereumProvider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  isCoinbaseWallet?: boolean
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

export function baseProvider(): EthereumProvider | null {
  return window.ethereum && typeof window.ethereum.request === 'function'
    ? window.ethereum
    : null
}

export function baseAccountAvailable(): boolean {
  return baseProvider() !== null
}

export function shortAddress(address: string | null): string {
  if (!address) return 'No wallet'
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export async function connectBaseAccount(): Promise<BaseAccountConnection> {
  const eth = baseProvider()
  if (!eth) {
    throw new Error('No wallet found. Open in Base App or a browser with Coinbase Wallet.')
  }

  const accounts = await eth.request({ method: 'eth_requestAccounts' })
  if (!Array.isArray(accounts) || typeof accounts[0] !== 'string') {
    throw new Error('Wallet did not return an account.')
  }

  let chainId: string | null = null
  try {
    const id = await eth.request({ method: 'eth_chainId' })
    chainId = typeof id === 'string' ? id : null
  } catch {
    chainId = null
  }

  return { address: accounts[0], chainId }
}
