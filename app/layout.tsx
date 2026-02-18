import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import '../src/style.css'

export const metadata: Metadata = {
  title: 'Arbitrum Coinflip',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="m-0 grid min-h-screen place-items-center bg-[radial-gradient(1200px_800px_at_50%_10%,#1b2a6a_0%,#0b1020_55%,#070a12_100%)] font-sans text-white/90 [text-rendering:optimizeLegibility] [-webkit-font-smoothing:antialiased] [-moz-osx-font-smoothing:grayscale]">
        {children}
      </body>
    </html>
  )
}
