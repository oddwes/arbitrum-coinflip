import { CoinFlip } from './CoinFlip'
import { WalletBar } from './WalletBar'
import { UnicornAutoConnectForce } from './UnicornAutoConnectForce'

export function App() {
  return (
    <>
      <UnicornAutoConnectForce debug={true} />
      <WalletBar />
      <CoinFlip />
    </>
  )
}

