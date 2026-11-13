import { describe, expect, it } from 'vitest'

import { computeRevealDelay, REVEAL_MAX_DELAY_MS } from './reveal-delay'

describe('computeRevealDelay', () => {
  it('arranca en 0 arriba a la izquierda', () => {
    expect(computeRevealDelay(0, 0)).toBe(0)
  })

  it('crece hacia abajo y hacia la derecha', () => {
    expect(computeRevealDelay(300, 0)).toBeGreaterThan(computeRevealDelay(100, 0))
    expect(computeRevealDelay(100, 600)).toBeGreaterThan(computeRevealDelay(100, 0))
  })

  it('a igual distancia, bajar retrasa más que ir a la derecha', () => {
    expect(computeRevealDelay(0, 300)).toBeLessThan(computeRevealDelay(300, 0))
  })

  it('no baja de 0 con posiciones negativas y respeta el tope', () => {
    expect(computeRevealDelay(-50, -50)).toBe(0)
    expect(computeRevealDelay(5000, 5000)).toBe(REVEAL_MAX_DELAY_MS)
  })
})
