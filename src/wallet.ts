import { unicornConnector } from '@unicorn.eth/autoconnect'
import { createConfig, http } from 'wagmi'
import { arbitrum } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const unicornClientId = import.meta.env.VITE_THIRDWEB_CLIENT_ID as string | undefined
export const unicornFactoryAddress = import.meta.env.VITE_THIRDWEB_FACTORY_ADDRESS as
  | `0x${string}`
  | undefined

export const injectedConnector = injected()

export const unicorn = unicornClientId && unicornFactoryAddress
  ? unicornConnector({
      clientId: unicornClientId,
      factoryAddress: unicornFactoryAddress,
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
  return url.searchParams.get('walletId') === 'inApp' && !!url.searchParams.get('authCookie')
}

export function isUnicornConfigured() {
  return !!unicorn
}

