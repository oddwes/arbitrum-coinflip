import { defineConfig } from 'vite'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const wagmiEntry = require.resolve('wagmi')

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^wagmi$/,
        replacement: new URL('./src/shims/wagmi.ts', import.meta.url).pathname,
      },
      {
        find: /^wagmi-real$/,
        replacement: wagmiEntry,
      },
    ],
  },
})

