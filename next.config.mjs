import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const wagmiEntry = require.resolve('wagmi')

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_THIRDWEB_CLIENT_ID:
      process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
    NEXT_PUBLIC_THIRDWEB_FACTORY_ADDRESS:
      process.env.NEXT_PUBLIC_THIRDWEB_FACTORY_ADDRESS,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      wagmi$: new URL('./src/shims/wagmi.ts', import.meta.url).pathname,
      'wagmi-real$': wagmiEntry,
      '@react-native-async-storage/async-storage': false,
    }
    return config
  },
}

export default nextConfig
