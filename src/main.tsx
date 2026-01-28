import './style.css'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { App } from './ui/App'
import { wagmiConfig } from './wallet'

const el = document.getElementById('app')
if (!el) throw new Error('Missing #app')

const queryClient = new QueryClient()

ReactDOM.createRoot(el).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)

