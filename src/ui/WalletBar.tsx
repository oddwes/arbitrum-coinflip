import { arbitrum } from 'wagmi/chains'
import { useAccount, useConnect, useDisconnect, useSwitchChain } from 'wagmi'
import {
  injectedConnector,
  isUnicornConfigured,
  shouldAutoConnectUnicornFromUrl,
  unicorn,
} from '../wallet'

const shortAddr = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

export function WalletBar() {
  const { address, status, chainId} = useAccount()
  const { connectAsync } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const { switchChainAsync } = useSwitchChain()

  const hint =
    shouldAutoConnectUnicornFromUrl() && !isUnicornConfigured()
      ? 'Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID / NEXT_PUBLIC_THIRDWEB_FACTORY_ADDRESS.'
      : null

  const isConnected = status === 'connected' && !!address
  const needsSwitch = isConnected && chainId !== arbitrum.id

  const onConnect = async () => {
    try {
      await connectAsync({
        connector: shouldAutoConnectUnicornFromUrl() && unicorn ? unicorn : injectedConnector,
        chainId: arbitrum.id,
      })
    } catch {
      // ignore
    }
  }

  const onSwitch = async () => {
    try {
      await switchChainAsync({ chainId: arbitrum.id })
    } catch {
      // ignore
    }
  }

  const onDisconnect = async () => {
    try {
      await disconnectAsync()
    } catch {
      // ignore
    }
  }

  return (
    <div className="fixed top-4 right-4 z-20 grid gap-2 rounded-[14px] border border-white/20 bg-slate-900/55 p-3 shadow-[0_16px_40px_rgba(0,0,0,0.32)] backdrop-blur-sm">
      <div className="flex items-center justify-end gap-2.5">
        <span className="text-xs opacity-[0.85]">Address</span>
        <span className="font-mono text-sm font-bold tracking-wide">
          {isConnected ? shortAddr(address) : 'Not connected'}
        </span>
      </div>

      {hint && <div className="max-w-80 text-right text-xs opacity-[0.85]">{hint}</div>}

      <div className="flex items-center justify-end gap-2.5">
        {!isConnected && (
          <button
            type="button"
            onClick={onConnect}
            className="min-w-0 rounded-xl border border-white/20 bg-slate-900/65 px-2.5 py-2 text-[13px] font-semibold text-white/90 transition hover:border-white/35 focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
          >
            Connect
          </button>
        )}
        {needsSwitch && (
          <button
            type="button"
            onClick={onSwitch}
            className="min-w-0 rounded-xl border border-white/20 bg-slate-900/65 px-2.5 py-2 text-[13px] font-semibold text-white/90 transition hover:border-white/35 focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
          >
            Switch
          </button>
        )}
        {isConnected && (
          <button
            type="button"
            onClick={onDisconnect}
            className="min-w-0 rounded-xl border border-white/20 bg-slate-900/65 px-2.5 py-2 text-[13px] font-semibold text-white/90 transition hover:border-white/35 focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  )
}

