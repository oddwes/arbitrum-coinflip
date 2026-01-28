import React from 'react'
import { UnicornAutoConnect } from '@unicorn.eth/autoconnect'
import { useAccount, useConnect, useConfig } from 'wagmi'

function isUnicornUrl() {
  const params = new URLSearchParams(window.location.search)
  return params.get('walletId') === 'inApp' && !!params.get('authCookie')
}

const nextPaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

export function UnicornAutoConnectForce({ debug = true }: { debug?: boolean }) {
  const { connectAsync, connectors } = useConnect()
  const { isConnected, connector } = useAccount()
  const config = useConfig()

  const inFlightRef = React.useRef(false)
  const attemptsRef = React.useRef(0)
  const doneRef = React.useRef(false)

  React.useEffect(() => {
    if (!isUnicornUrl()) return
    if (isConnected && connector?.id === 'unicorn') return
    if (doneRef.current) return

    const unicornConnector = connectors.find((c) => c.id === 'unicorn')
    // Important: if wagmi hasn't exposed connectors yet, bail and let the effect rerun.
    if (!unicornConnector) return
    if (inFlightRef.current) return

    inFlightRef.current = true
    let cancelled = false

    const run = async () => {
      await nextPaint()
      if (cancelled) return

      const chains: any[] = (config as any).chains || (config as any)._internal?.chains || []
      const chainId: number | undefined = chains[0]?.id

      while (attemptsRef.current < 3 && !cancelled) {
        const n = attemptsRef.current + 1
        try {
          await connectAsync({ connector: unicornConnector, chainId })
          doneRef.current = true
          return
        } catch (err) {
          attemptsRef.current++
          if (debug) console.warn(`[UnicornAutoConnectForce] connect attempt ${n} failed`, err)
          await new Promise((r) => setTimeout(r, 250 * n))
        }
      }
      doneRef.current = true
    }

    void run()
    return () => {
      cancelled = true
      inFlightRef.current = false
    }
  }, [connectAsync, connectors, isConnected, connector?.id, config, debug])

  return <UnicornAutoConnect debug={debug} />
}

