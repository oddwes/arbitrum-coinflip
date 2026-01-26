import './style.css'

type Side = 'heads' | 'tails'

import headsUrl from '/coin-heads.svg'
import tailsUrl from '/coin-tails.svg'

const app = document.querySelector<HTMLDivElement>('#app')
if (!app) throw new Error('Missing #app')

app.innerHTML = `
  <main class="page">
    <div class="coin-scene">
      <div class="coin-shadow">
        <div id="coin" class="coin" data-side="heads" aria-label="Coin result: heads">
          <div class="face front"><img src="${headsUrl}" alt="Heads" draggable="false" /></div>
          <div class="face back"><img src="${tailsUrl}" alt="Tails" draggable="false" /></div>
        </div>
      </div>
    </div>

    <div class="controls">
      <button id="btn-heads" type="button">Heads</button>
      <button id="btn-tails" type="button">Tails</button>
    </div>
  </main>
`

const coin = document.querySelector<HTMLDivElement>('#coin')!
const btnHeads = document.querySelector<HTMLButtonElement>('#btn-heads')!
const btnTails = document.querySelector<HTMLButtonElement>('#btn-tails')!

const win = document.createElement('div')
win.className = 'win-banner'
win.setAttribute('aria-hidden', 'true')
win.innerHTML = `<span>WIN</span>`
document.body.appendChild(win)

const fx = document.createElement('canvas')
fx.className = 'fx-canvas'
fx.setAttribute('aria-hidden', 'true')
document.body.appendChild(fx)

const _fxCtx = fx.getContext('2d')
if (!_fxCtx) throw new Error('Missing canvas context')
const fxCtx = _fxCtx

function resizeFx() {
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  fx.width = Math.floor(window.innerWidth * dpr)
  fx.height = Math.floor(window.innerHeight * dpr)
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

resizeFx()
window.addEventListener('resize', resizeFx)

type Rocket = { x: number; y: number; vx: number; vy: number; color: string; exploded: boolean }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string }

let fxActive = false
let rockets: Rocket[] = []
let particles: Particle[] = []
let fxStart = 0
let lastSpawn = 0

const colors = ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f472b6']

function startFireworks() {
  fxActive = true
  rockets = []
  particles = []
  fxStart = performance.now()
  lastSpawn = 0
  win.classList.add('is-visible')
  requestAnimationFrame(tickFx)
}

function explode(r: Rocket) {
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

function tickFx(now: number) {
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

  fxCtx.globalCompositeOperation = 'source-over'
  fxCtx.fillStyle = 'rgba(0,0,0,0.14)'
  fxCtx.fillRect(0, 0, window.innerWidth, window.innerHeight)

  fxCtx.globalCompositeOperation = 'lighter'

  for (const r of rockets) {
    r.x += r.vx
    r.y += r.vy
    r.vy += 0.06
    fxCtx.fillStyle = r.color
    fxCtx.fillRect(r.x - 1, r.y - 1, 2, 2)
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
    fxCtx.fillStyle = p.color
    fxCtx.globalAlpha = a
    fxCtx.fillRect(p.x - 1.2, p.y - 1.2, 2.4, 2.4)
  }
  fxCtx.globalAlpha = 1
  particles = particles.filter((p) => p.life > 0)

  if (elapsed > 1900 && rockets.length === 0 && particles.length === 0) {
    fxActive = false
    fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    win.classList.remove('is-visible')
    return
  }

  requestAnimationFrame(tickFx)
}

let isFlipping = false
let rotation = 0

const sideAngle = (side: Side) => (side === 'heads' ? 0 : 180)
const mod360 = (deg: number) => ((deg % 360) + 360) % 360

function setDisabled(disabled: boolean) {
  btnHeads.disabled = disabled
  btnTails.disabled = disabled
}

function flip(guess: Side) {
  if (isFlipping) return
  isFlipping = true
  setDisabled(true)

  const durationMs = 1500 + Math.random() * 500
  const result: Side = Math.random() < 0.5 ? 'heads' : 'tails'
  const spins = 3 + Math.floor(Math.random() * 2)

  const target = sideAngle(result)
  const current = mod360(rotation)
  const delta = (target - current + 360) % 360
  const next = rotation + spins * 360 + delta

  coin.classList.add('is-flipping')
  coin.style.transitionDuration = `${durationMs}ms`
  requestAnimationFrame(() => {
    coin.style.transform = `rotateY(${next}deg)`
  })

  window.setTimeout(() => {
    rotation = next
    coin.dataset.side = result
    coin.setAttribute('aria-label', `Coin result: ${result}`)
    coin.classList.remove('is-flipping')
    setDisabled(false)
    isFlipping = false
    if (result === guess) startFireworks()
  }, durationMs + 40)
}

btnHeads.addEventListener('click', () => flip('heads'))
btnTails.addEventListener('click', () => flip('tails'))
