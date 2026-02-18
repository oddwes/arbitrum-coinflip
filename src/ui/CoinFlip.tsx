import React from 'react'
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi'
import { arbitrum } from 'wagmi/chains'

type Side = 'heads' | 'tails'
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
  const [viewportScale, setViewportScale] = React.useState(1)
  const [winStreak, setWinStreak] = React.useState(0)
  const [showWinBanner, setShowWinBanner] = React.useState(false)
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const coinRef = React.useRef<HTMLDivElement | null>(null)
  const winRef = React.useRef<HTMLDivElement | null>(null)
  const fxRef = React.useRef<HTMLCanvasElement | null>(null)

  const rotationRef = React.useRef(0)
  const flippingRef = React.useRef(false)
  const bannerTimeoutRef = React.useRef<number | null>(null)
  const winAudioRef = React.useRef<HTMLAudioElement | null>(null)
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
    const stage = stageRef.current
    if (!stage) return

    let frame = 0
    const updateScale = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const w = stage.scrollWidth
        const h = stage.scrollHeight
        if (!w || !h) return
        const maxW = Math.max(240, window.innerWidth - 24)
        const maxH = Math.max(240, window.innerHeight - 24)
        const next = Math.min(1, maxW / w, maxH / h)
        setViewportScale((prev) => (Math.abs(prev - next) < 0.01 ? prev : next))
      })
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(stage)
    window.addEventListener('resize', updateScale)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateScale)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  React.useEffect(() => {
    winAudioRef.current = new Audio('/ding.m4a')
  }, [])

  React.useEffect(() => {
    if (!isConfirmed) return
    setClaimSuccess(true)
    setClaimError(null)
    setWinStreak(0)
    startFireworksRef.current?.()
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

    const getViewport = () => {
      const vv = window.visualViewport
      return {
        width: vv?.width ?? window.innerWidth,
        height: vv?.height ?? window.innerHeight,
        offsetLeft: vv?.offsetLeft ?? 0,
        offsetTop: vv?.offsetTop ?? 0,
      }
    }

    const resizeFx = () => {
      const viewport = getViewport()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      fx.style.width = `${viewport.width}px`
      fx.style.height = `${viewport.height}px`
      fx.style.left = `${viewport.offsetLeft}px`
      fx.style.top = `${viewport.offsetTop}px`
      fx.width = Math.floor(viewport.width * dpr)
      fx.height = Math.floor(viewport.height * dpr)
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

      const viewport = getViewport()
      const vw = viewport.width
      const vh = viewport.height
      const elapsed = now - fxStart
      if (elapsed < 820 && now - lastSpawn > 70) {
        lastSpawn = now
        const count = 1 + (Math.random() < 0.35 ? 1 : 0)
        for (let i = 0; i < count; i++) {
          const x = vw * (0.18 + Math.random() * 0.64)
          rockets.push({
            x,
            y: vh + 10,
            vx: (Math.random() - 0.5) * 0.75,
            vy: -(7.0 + Math.random() * 3.2),
            color: colors[Math.floor(Math.random() * colors.length)]!,
            exploded: false,
          })
        }
      }

      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(0,0,0,0.14)'
      ctx.fillRect(0, 0, vw, vh)

      ctx.globalCompositeOperation = 'lighter'

      for (const r of rockets) {
        r.x += r.vx
        r.y += r.vy
        r.vy += 0.06
        ctx.fillStyle = r.color
        ctx.fillRect(r.x - 1, r.y - 1, 2, 2)
        if (!r.exploded && (r.vy > -1.5 || r.y < vh * 0.28)) {
          r.exploded = true
          explode(r)
        }
      }
      rockets = rockets.filter((r) => !r.exploded && r.y < vh + 40)

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
        ctx.clearRect(0, 0, vw, vh)
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
    window.visualViewport?.addEventListener('resize', resizeFx)
    window.visualViewport?.addEventListener('scroll', resizeFx)

    return () => {
      if (bannerTimeoutRef.current) {
        window.clearTimeout(bannerTimeoutRef.current)
      }
      window.removeEventListener('resize', resizeFx)
      window.visualViewport?.removeEventListener('resize', resizeFx)
      window.visualViewport?.removeEventListener('scroll', resizeFx)
      startFireworksRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'Space' && event.code !== 'Enter') return
      event.preventDefault()
      if (event.code === 'Enter') {
        setShowWinBanner(true)
        if (bannerTimeoutRef.current) {
          window.clearTimeout(bannerTimeoutRef.current)
        }
        bannerTimeoutRef.current = window.setTimeout(() => {
          setShowWinBanner(false)
          bannerTimeoutRef.current = null
        }, 900)
        return
      }
      startFireworksRef.current?.()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  React.useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    let lastTapAt = 0
    let lastTapX = 0
    let lastTapY = 0

    const onTouchEnd = (event: TouchEvent) => {
      const touch = event.changedTouches[0]
      if (!touch) return

      const now = Date.now()
      const isNearLastTap = Math.hypot(touch.clientX - lastTapX, touch.clientY - lastTapY) < 40
      if (now - lastTapAt < 300 && isNearLastTap) {
        startFireworksRef.current?.()
        lastTapAt = 0
        return
      }

      lastTapAt = now
      lastTapX = touch.clientX
      lastTapY = touch.clientY
    }

    stage.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => stage.removeEventListener('touchend', onTouchEnd)
  }, [])

  const playWinSound = () => {
    const audio = winAudioRef.current
    if (!audio) return
    audio.currentTime = 0
    void audio.play().catch(() => undefined)
  }

  const flip = (guess: Side) => {
    const coin = coinRef.current
    if (!coin) return
    if (flippingRef.current) return

    flippingRef.current = true
    setIsFlipping(true)

    const durationMs = 1000 + Math.random() * 250
    const result: Side = Math.random() < 0.5 ? 'heads' : 'tails'
    const spins = 3 + Math.floor(Math.random() * 2)

    const target = sideAngle(result)
    const current = mod360(rotationRef.current)
    const delta = (target - current + 360) % 360
    const next = rotationRef.current + spins * 360 + delta

    coin.classList.add('is-flipping')
    coin.style.transitionDuration = `${durationMs}ms`
    coin.style.transitionTimingFunction = 'cubic-bezier(0.22, 0.9, 0.3, 1)'
    requestAnimationFrame(() => {
      coin.style.transform = `rotateY(${next}deg)`
    })

    let settled = false
    const settleFlip = () => {
      if (settled) return
      settled = true
      rotationRef.current = next
      coin.dataset.side = result
      coin.setAttribute('aria-label', `Coin result: ${result}`)
      coin.classList.remove('is-flipping')
      flippingRef.current = false
      setIsFlipping(false)
      if (result === guess) {
        playWinSound()
        setShowWinBanner(true)
        if (bannerTimeoutRef.current) {
          window.clearTimeout(bannerTimeoutRef.current)
        }
        bannerTimeoutRef.current = window.setTimeout(() => {
          setShowWinBanner(false)
          bannerTimeoutRef.current = null
        }, 900)
        setWinStreak((prev) => prev + 1)
      } else {
        setShowWinBanner(false)
        setWinStreak(0)
      }
    }

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== coin || event.propertyName !== 'transform') return
      coin.removeEventListener('transitionend', onTransitionEnd)
      window.clearTimeout(fallbackTimer)
      settleFlip()
    }

    coin.addEventListener('transitionend', onTransitionEnd)
    const fallbackTimer = window.setTimeout(() => {
      coin.removeEventListener('transitionend', onTransitionEnd)
      settleFlip()
    }, durationMs + 120)
  }

  const canMint = isMounted && !!isConnected && !!address && chainId === arbitrum.id && !!tierAccessAddress
  const hasSilver = isMounted && (silverBalance ?? 0n) > 0n
  const hasGold = isMounted && (goldBalance ?? 0n) > 0n
  const canMintSilver = winStreak >= 2
  const canMintGold = winStreak >= 3

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
      <main className="coinflip-shell">
        <div ref={stageRef} className="coinflip-stage" style={{ transform: `scale(${viewportScale})` }}>
          <div className="grid content-center justify-items-center gap-4">
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

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => flip('heads')}
                disabled={!isMounted || !isConnected || isFlipping}
                className="min-w-[140px] rounded-xl border border-blue-300/60 bg-gradient-to-b from-blue-500/95 to-blue-600/90 px-5 py-3.5 text-base font-semibold tracking-wide text-white transition hover:border-blue-200/80 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
              >
                Heads
              </button>
              <button
                type="button"
                onClick={() => flip('tails')}
                disabled={!isMounted || !isConnected || isFlipping}
                className="min-w-[140px] rounded-xl border border-white/15 bg-slate-900/65 px-5 py-3.5 text-base font-semibold tracking-wide text-white/90 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
              >
                Tails
              </button>
            </div>
          </div>

          <div className="grid justify-items-center gap-2 text-center pt-4">
            <div className="inline-flex items-center rounded-full border border-amber-300/50 bg-gradient-to-b from-amber-900/60 to-amber-950/80 px-4 py-2 text-sm font-bold tracking-[0.08em] text-amber-200 uppercase shadow-[inset_0_0_16px_rgba(251,191,36,0.2),0_0_22px_rgba(251,191,36,0.24)]">
              Streak:
              <span className="ml-2 text-2xl leading-none font-black tracking-[0.04em] text-amber-50 [text-shadow:0_0_8px_rgba(251,191,36,0.8),0_0_18px_rgba(251,191,36,0.45)]">
                {winStreak}
              </span>
            </div>
            {!tierAccessAddress && <div className="text-sm text-white/85">Set NEXT_PUBLIC_TIER_ACCESS_CONTRACT to enable minting.</div>}
            {!!tierAccessAddress && isMounted && chainId !== arbitrum.id && (
              <div className="text-sm text-white/85">Switch to Arbitrum to mint.</div>
            )}
            <div className="flex flex-wrap items-end justify-center gap-2.5 pt-10">
              {hasSilver ? (
                <button
                  type="button"
                  onClick={() => window.open(openSeaUrlFor(SILVER_TOKEN_ID), '_blank', 'noopener,noreferrer')}
                  className="min-w-[140px] rounded-xl border border-white/15 bg-slate-900/65 px-5 py-3.5 text-base font-semibold tracking-wide text-white/90 transition hover:border-white/30 focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
                >
                  View Silver on OpenSea
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void mintTier(SILVER_TOKEN_ID)}
                  disabled={!canMint || !canMintSilver || isMinting || isConfirming}
                  className="min-w-[140px] rounded-xl border border-white/15 bg-slate-900/65 px-5 py-3.5 text-base font-semibold tracking-wide text-white/90 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
                >
                  Mint Silver (2 wins)
                </button>
              )}
              {hasGold ? (
                <button
                  type="button"
                  onClick={() => window.open(openSeaUrlFor(GOLD_TOKEN_ID), '_blank', 'noopener,noreferrer')}
                  className="min-w-[140px] rounded-xl border border-white/15 bg-slate-900/65 px-5 py-3.5 text-base font-semibold tracking-wide text-white/90 transition hover:border-white/30 focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
                >
                  View Gold on OpenSea
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void mintTier(GOLD_TOKEN_ID)}
                  disabled={!canMint || !canMintGold || isMinting || isConfirming}
                  className="min-w-[140px] rounded-xl border border-white/15 bg-slate-900/65 px-5 py-3.5 text-base font-semibold tracking-wide text-white/90 transition hover:border-white/30 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-white/60 focus-visible:outline-offset-2"
                >
                  Mint Gold (3 wins)
                </button>
              )}
            </div>
            {(isMinting || isConfirming || claimSuccess || claimError) && (
              <div className="grid w-[min(420px,90vw)] gap-2">
                {isMinting && <div className="text-sm text-white/90">Confirm claim in wallet...</div>}
                {isConfirming && <div className="text-sm text-white/90">Claim submitted. Waiting for confirmation...</div>}
                {claimSuccess && !isMinting && !isConfirming && <div className="text-sm text-emerald-300">Claimed!</div>}
                {claimError && !isMinting && !isConfirming && <div className="text-sm text-rose-300">Claim failed. Try again.</div>}
                {(isMinting || isConfirming) && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
                    <div className="claim-progress-bar h-full w-[45%] rounded-full bg-gradient-to-r from-blue-400 to-amber-400" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <div
        className={`guess-win-banner pointer-events-none fixed top-20 left-1/2 z-20 rounded-2xl border border-emerald-200/40 bg-emerald-500/20 px-6 py-3 text-4xl font-black tracking-[2px] text-emerald-200 shadow-[0_14px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm ${showWinBanner ? 'is-visible' : ''}`}
        aria-hidden="true"
      >
        WIN!
      </div>
      <div
        ref={winRef}
        className="win-banner pointer-events-none fixed top-1/2 left-1/2 z-20 rounded-[20px] border border-white/20 bg-slate-900/55 px-8 py-6 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm"
        aria-hidden="true"
      >
        <span className="inline-block bg-gradient-to-b from-yellow-200 via-amber-400 to-rose-400 bg-clip-text text-[clamp(56px,10vw,108px)] leading-none font-black tracking-[2px] text-transparent [text-shadow:0_1px_0_rgba(0,0,0,0.15)]">
          CLAIMED!
        </span>
      </div>
      <canvas ref={fxRef} className="pointer-events-none fixed inset-0 z-10 h-screen w-screen" aria-hidden="true" />
    </>
  )
}

