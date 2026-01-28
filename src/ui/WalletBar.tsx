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
      ? 'Missing VITE_THIRDWEB_CLIENT_ID / VITE_THIRDWEB_FACTORY_ADDRESS.'
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
    <div className="wallet-status">
      <div className="wallet-row">
        <span className="wallet-label">Address</span>
        <span className="wallet-address">{isConnected ? shortAddr(address) : 'Not connected'}</span>
      </div>

      {hint && <div className="wallet-hint">{hint}</div>}

      <div className="wallet-row">
        {!isConnected && (
          <button type="button" onClick={onConnect}>
            Connect
          </button>
        )}
        {needsSwitch && (
          <button type="button" onClick={onSwitch}>
            Switch
          </button>
        )}
        {isConnected && (
          <button type="button" onClick={onDisconnect}>
            Disconnect
          </button>
        )}
      </div>
    </div>
  )
}

