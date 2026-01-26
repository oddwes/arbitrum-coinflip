import './style.css'

type Side = 'heads' | 'tails'

import headsUrl from './assets/coin-heads.svg'
import tailsUrl from './assets/coin-tails.svg'

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

let isFlipping = false
let rotation = 0

const sideAngle = (side: Side) => (side === 'heads' ? 0 : 180)
const mod360 = (deg: number) => ((deg % 360) + 360) % 360

function setDisabled(disabled: boolean) {
  btnHeads.disabled = disabled
  btnTails.disabled = disabled
}

function flip() {
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
  }, durationMs + 40)
}

btnHeads.addEventListener('click', flip)
btnTails.addEventListener('click', flip)
