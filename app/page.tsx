import { App } from '../src/ui/App'
import { Providers } from './providers'

export default function Page() {
  return (
    <Providers>
      <div id="app" className="w-[min(680px,92vw)] px-4 pt-6 pb-10">
        <App />
      </div>
    </Providers>
  )
}
