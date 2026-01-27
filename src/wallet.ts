import { unicornConnector } from '@unicorn.eth/autoconnect'
import { createConfig, http } from 'wagmi'
import { arbitrum } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

const thirdwebClientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID as string | undefined
const thirdwebFactoryAddress = import.meta.env.VITE_THIRDWEB_FACTORY_ADDRESS as
  | `0x${string}`
  | undefined

export const injectedConnector = injected()

export const unicorn = thirdwebClientId && thirdwebFactoryAddress
  ? unicornConnector({
      clientId: thirdwebClientId,
      factoryAddress: thirdwebFactoryAddress,
      defaultChain: arbitrum.id,
    })
  : undefined

export const wagmiConfig = createConfig({
  chains: [arbitrum],
  connectors: [injectedConnector, ...(unicorn ? [unicorn] : [])],
  transports: {
    [arbitrum.id]: http(),
  },
})

export function shouldAutoConnectUnicornFromUrl() {
  const url = new URL(window.location.href)
  return url.searchParams.has('walletId') && url.searchParams.has('authCookie')
}

