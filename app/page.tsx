import { App } from '../src/ui/App'
import { Providers } from './providers'

export default function Page() {
  return (
    <Providers>
      <div id="app" className="w-screen min-h-screen">
        <App />
      </div>
    </Providers>
  )
}
