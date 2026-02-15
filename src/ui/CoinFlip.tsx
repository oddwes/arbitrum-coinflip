import React from 'react'
import { useAccount } from 'wagmi'

type Side = 'heads' | 'tails'
type Rocket = { x: number; y: number; vx: number; vy: number; color: string; exploded: boolean }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string }

const headsUrl = '/coin-heads.svg'
const tailsUrl = '/coin-tails.svg'
const colors = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f472b6']
const sideAngle = (side: Side) => (side === 'heads' ? 0 : 180)
const mod360 = (deg: number) => ((deg % 360) + 360) % 360

export function CoinFlip() {
  const { isConnected } = useAccount()
  const [isFlipping, setIsFlipping] = React.useState(false)
  const [isMounted, setIsMounted] = React.useState(false)
  const coinRef = React.useRef<HTMLDivElement | null>(null)
  const winRef = React.useRef<HTMLDivElement | null>(null)
  const fxRef = React.useRef<HTMLCanvasElement | null>(null)

  const rotationRef = React.useRef(0)
  const flippingRef = React.useRef(false)

  const startFireworksRef = React.useRef<(() => void) | null>(null)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

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
      window.removeEventListener('resize', resizeFx)
      startFireworksRef.current = null
    }
  }, [])

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
      if (result === guess) startFireworksRef.current?.()
    }, durationMs + 40)
  }

  return (
    <>
      <main className="page">
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
      </main>

      <div ref={winRef} className="win-banner" aria-hidden="true">
        <span>WIN</span>
      </div>
      <canvas ref={fxRef} className="fx-canvas" aria-hidden="true" />
    </>
  )
}

