import React from 'react'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { arbitrum } from 'wagmi/chains'

type Side = 'heads' | 'tails'
type Mode = 'free' | 'streak'
type Rocket = { x: number; y: number; vx: number; vy: number; color: string; exploded: boolean }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string }

const headsUrl = '/coin-heads.png'
const tailsUrl = '/coin-tails.png'
const colors = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f472b6']
const sideAngle = (side: Side) => (side === 'heads' ? 0 : 180)
const mod360 = (deg: number) => ((deg % 360) + 360) % 360

const tierAccessAbi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'id', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
] as const

const SILVER_TOKEN_ID = BigInt(process.env.NEXT_PUBLIC_SILVER_TOKEN_ID ?? '1')
const GOLD_TOKEN_ID = BigInt(process.env.NEXT_PUBLIC_GOLD_TOKEN_ID ?? '2')
const tierAccessAddress = process.env.NEXT_PUBLIC_TIER_ACCESS_CONTRACT as `0x${string}` | undefined
const zeroAddress = '0x0000000000000000000000000000000000000000' as const

export function CoinFlip() {
  const { address, isConnected, chainId } = useAccount()
  const [isFlipping, setIsFlipping] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)
  const [mode, setMode] = React.useState<Mode>('free')
  const [winStreak, setWinStreak] = React.useState(0)
  const coinRef = React.useRef<HTMLDivElement | null>(null)
  const winRef = React.useRef<HTMLDivElement | null>(null)
  const fxRef = React.useRef<HTMLCanvasElement | null>(null)

  const rotationRef = React.useRef(0)
  const flippingRef = React.useRef(false)
  const bannerTimeoutRef = React.useRef<number | null>(null)
  const [claimError, setClaimError] = React.useState<string | null>(null)
  const [claimSuccess, setClaimSuccess] = React.useState(false)
  const { writeContractAsync, data: hash, isPending: isMinting } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })
  const accountForRead = (address ?? zeroAddress) as `0x${string}`
  const { data: silverBalance, refetch: refetchSilverBalance } = useReadContract({
    abi: tierAccessAbi,
    address: tierAccessAddress,
    functionName: 'balanceOf',
    args: [accountForRead, SILVER_TOKEN_ID],
    query: { enabled: !!tierAccessAddress && !!address && chainId === arbitrum.id },
  })
  const { data: goldBalance, refetch: refetchGoldBalance } = useReadContract({
    abi: tierAccessAbi,
    address: tierAccessAddress,
    functionName: 'balanceOf',
    args: [accountForRead, GOLD_TOKEN_ID],
    query: { enabled: !!tierAccessAddress && !!address && chainId === arbitrum.id },
  })

  const startFireworksRef = React.useRef<(() => void) | null>(null)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  React.useEffect(() => {
    if (!isConfirmed) return
    setClaimSuccess(true)
    setClaimError(null)
    setWinStreak(0)
    void refetchSilverBalance()
    void refetchGoldBalance()
  }, [isConfirmed, refetchSilverBalance, refetchGoldBalance])

  React.useEffect(() => {
    const fx = fxRef.current
    const win = winRef.current
    if (!fx || !win) return

    const ctx = fx.getContext('2d')
    if (!ctx) return

    let fxActive = false
    let rockets: Rocket[] = []
    let particles: Particle[] = []
    let fxStart = 0
    let lastSpawn = 0

    const resizeFx = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      fx.width = Math.floor(window.innerWidth * dpr)
      fx.height = Math.floor(window.innerHeight * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const explode = (r: Rocket) => {
      const n = 46 + Math.floor(Math.random() * 20)
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2
        const s = 1.2 + Math.random() * 2.6
        particles.push({
          x: r.x,
          y: r.y,
          vx: Math.cos(a) * s + (Math.random() - 0.5) * 0.5,
          vy: Math.sin(a) * s + (Math.random() - 0.5) * 0.5,
          life: 700 + Math.random() * 500,
          color: r.color,
        })
      }
    }

    const tickFx = (now: number) => {
      if (!fxActive) return

      const elapsed = now - fxStart
      if (elapsed < 820 && now - lastSpawn > 70) {
        lastSpawn = now
        const count = 1 + (Math.random() < 0.35 ? 1 : 0)
        for (let i = 0; i < count; i++) {
          const x = window.innerWidth * (0.18 + Math.random() * 0.64)
          rockets.push({
            x,
            y: window.innerHeight + 10,
            vx: (Math.random() - 0.5) * 0.75,
            vy: -(7.0 + Math.random() * 3.2),
            color: colors[Math.floor(Math.random() * colors.length)]!,
            exploded: false,
          })
        }
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(0,0,0,0.14)'
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight)

      ctx.globalCompositeOperation = 'lighter'

      for (const r of rockets) {
        r.x += r.vx
        r.y += r.vy
        r.vy += 0.06
        ctx.fillStyle = r.color
        ctx.fillRect(r.x - 1, r.y - 1, 2, 2)
        if (!r.exploded && (r.vy > -1.5 || r.y < window.innerHeight * 0.28)) {
          r.exploded = true
          explode(r)
        }
      }
      rockets = rockets.filter((r) => !r.exploded && r.y < window.innerHeight + 40)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.05
        p.vx *= 0.992
        p.vy *= 0.992
        p.life -= 16.7
        const a = Math.max(0, Math.min(1, p.life / 900))
        ctx.fillStyle = p.color
        ctx.globalAlpha = a
        ctx.fillRect(p.x - 1.2, p.y - 1.2, 2.4, 2.4)
      }
      ctx.globalAlpha = 1
      particles = particles.filter((p) => p.life > 0)

      if (elapsed > 1900 && rockets.length === 0 && particles.length === 0) {
        fxActive = false
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
        win.classList.remove('is-visible')
        return
      }

      requestAnimationFrame(tickFx)
    }

    const startFireworks = () => {
      fxActive = true
      rockets = []
      particles = []
      fxStart = performance.now()
      lastSpawn = 0
      win.classList.add('is-visible')
      requestAnimationFrame(tickFx)
    }

    startFireworksRef.current = startFireworks
    resizeFx()
    window.addEventListener('resize', resizeFx)

    return () => {
      if (bannerTimeoutRef.current) {
        window.clearTimeout(bannerTimeoutRef.current)
      }
      window.removeEventListener('resize', resizeFx)
      startFireworksRef.current = null
    }
  }, [])

  const showWinBannerOnly = () => {
    const win = winRef.current
    if (!win) return
    win.classList.add('is-visible')
    if (bannerTimeoutRef.current) {
      window.clearTimeout(bannerTimeoutRef.current)
    }
    bannerTimeoutRef.current = window.setTimeout(() => {
      win.classList.remove('is-visible')
      bannerTimeoutRef.current = null
    }, 1100)
  }

  const flip = (guess: Side) => {
    const coin = coinRef.current
    if (!coin) return
    if (flippingRef.current) return

    flippingRef.current = true
    setIsFlipping(true)

    const durationMs = 1500 + Math.random() * 500
    const result: Side = Math.random() < 0.5 ? 'heads' : 'tails'
    const spins = 3 + Math.floor(Math.random() * 2)

    const target = sideAngle(result)
    const current = mod360(rotationRef.current)
    const delta = (target - current + 360) % 360
    const next = rotationRef.current + spins * 360 + delta

    coin.classList.add('is-flipping')
    coin.style.transitionDuration = `${durationMs}ms`
    requestAnimationFrame(() => {
      coin.style.transform = `rotateY(${next}deg)`
    })

    window.setTimeout(() => {
      rotationRef.current = next
      coin.dataset.side = result
      coin.setAttribute('aria-label', `Coin result: ${result}`)
      coin.classList.remove('is-flipping')
      flippingRef.current = false
      setIsFlipping(false)
      if (result === guess) {
        if (mode === 'free') {
          startFireworksRef.current?.()
        } else {
          showWinBannerOnly()
          setWinStreak((prev) => prev + 1)
        }
      } else if (mode === 'streak') {
        setWinStreak(0)
      }
    }, durationMs + 40)
  }

  const switchMode = (nextMode: Mode) => {
    setMode(nextMode)
    setWinStreak(0)
    if (bannerTimeoutRef.current) {
      window.clearTimeout(bannerTimeoutRef.current)
      bannerTimeoutRef.current = null
    }
    winRef.current?.classList.remove('is-visible')
  }

  const canMint = !!isConnected && !!address && chainId === arbitrum.id && !!tierAccessAddress
  const hasSilver = (silverBalance ?? 0n) > 0n
  const hasGold = (goldBalance ?? 0n) > 0n
  const canMintSilver = mode === 'streak' && winStreak >= 2
  const canMintGold = mode === 'streak' && winStreak >= 3

  const openSeaUrlFor = (tokenId: bigint) =>
    `https://opensea.io/assets/arbitrum/${tierAccessAddress}/${tokenId.toString()}`

  const mintTier = async (tokenId: bigint) => {
    if (!canMint || !tierAccessAddress) return
    setClaimError(null)
    setClaimSuccess(false)
    try {
      await writeContractAsync({
        abi: tierAccessAbi,
        address: tierAccessAddress,
        functionName: 'claim',
        args: [tokenId],
      })
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : 'Claim failed.')
    }
  }

  return (
    <>
      <main className="page">
        <div className="mode-switch">
          <button
            type="button"
            className={mode === 'free' ? 'active' : ''}
            onClick={() => switchMode('free')}
            disabled={isFlipping}
          >
            Free Play
          </button>
          <button
            type="button"
            className={mode === 'streak' ? 'active' : ''}
            onClick={() => switchMode('streak')}
            disabled={isFlipping}
          >
            Play for Streak
          </button>
        </div>

        <div className="coin-scene">
          <div className="coin-shadow">
            <div
              ref={coinRef}
              className="coin"
              data-side="heads"
              aria-label="Coin result: heads"
              style={{ transform: 'rotateY(0deg)' }}
            >
              <div className="face front">
                <img src={headsUrl} alt="Heads" draggable={false} />
              </div>
              <div className="face back">
                <img src={tailsUrl} alt="Tails" draggable={false} />
              </div>
            </div>
          </div>
        </div>

        <div className="controls">
          <button
            type="button"
            onClick={() => flip('heads')}
            disabled={!isMounted || !isConnected || isFlipping}
            style={{ background: '#2563eb', color: '#fff' }}
          >
            Heads
          </button>
          <button
            type="button"
            onClick={() => flip('tails')}
            disabled={!isMounted || !isConnected || isFlipping}
          >
            Tails
          </button>
        </div>

        {mode === 'streak' && (
          <div className="streak-panel">
            <div className="streak-display">Streak: <span>{winStreak}</span></div>
            {!tierAccessAddress && <div>Set NEXT_PUBLIC_TIER_ACCESS_CONTRACT to enable minting.</div>}
            {!!tierAccessAddress && chainId !== arbitrum.id && <div>Switch to Arbitrum to mint.</div>}
            <div className="mint-actions">
              {hasSilver ? (
                <button
                  type="button"
                  onClick={() => window.open(openSeaUrlFor(SILVER_TOKEN_ID), '_blank', 'noopener,noreferrer')}
                >
                  View Silver on OpenSea
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void mintTier(SILVER_TOKEN_ID)}
                  disabled={!canMint || !canMintSilver || isMinting || isConfirming}
                >
                  Mint Silver (2 wins)
                </button>
              )}
              {hasGold ? (
                <button
                  type="button"
                  onClick={() => window.open(openSeaUrlFor(GOLD_TOKEN_ID), '_blank', 'noopener,noreferrer')}
                >
                  View Gold on OpenSea
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void mintTier(GOLD_TOKEN_ID)}
                  disabled={!canMint || !canMintGold || isMinting || isConfirming}
                >
                  Mint Gold (3 wins)
                </button>
              )}
            </div>
            {(isMinting || isConfirming || claimSuccess || claimError) && (
              <div className="claim-status">
                {isMinting && <div>Confirm claim in wallet...</div>}
                {isConfirming && <div>Claim submitted. Waiting for confirmation...</div>}
                {claimSuccess && !isMinting && !isConfirming && <div>Claimed!</div>}
                {claimError && !isMinting && !isConfirming && <div>Claim failed. Try again.</div>}
                {(isMinting || isConfirming) && (
                  <div className="claim-progress">
                    <div className="claim-progress-bar" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <div ref={winRef} className="win-banner" aria-hidden="true">
        <span>WIN</span>
      </div>
      <canvas ref={fxRef} className="fx-canvas" aria-hidden="true" />
    </>
  )
}

