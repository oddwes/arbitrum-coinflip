import { CoinFlip } from './CoinFlip'
import { WalletBar } from './WalletBar'
import { UnicornAutoConnect } from '@unicorn.eth/autoconnect'

export function App() {
  return (
    <>
      <UnicornAutoConnect debug={true} />
      <WalletBar />
      <CoinFlip />
    </>
  )
}

