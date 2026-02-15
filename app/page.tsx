import { App } from '../src/ui/App'
import { Providers } from './providers'

export default function Page() {
  return (
    <Providers>
      <div id="app">
        <App />
      </div>
    </Providers>
  )
}
