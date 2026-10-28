import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  BEHIND_KNOWN_MAX_WAIT_MS,
  isChatBehindKnownMessage,
  waitAtMost,
} from '@/src/modules/portal/domain/chat-behind-known-message'

const msgs = (...ids: number[]) => ids.map((id) => ({ id }))

describe('isChatBehindKnownMessage', () => {
  it('va por detrás si el aviso trae un mensaje más nuevo que el último guardado', () => {
    expect(isChatBehindKnownMessage(msgs(10, 11, 12), 13)).toBe(true)
  })

  it('no va por detrás si el aviso es del último mensaje guardado o de uno anterior', () => {
    expect(isChatBehindKnownMessage(msgs(10, 11, 12), 12)).toBe(false)
    expect(isChatBehindKnownMessage(msgs(10, 11, 12), 5)).toBe(false)
  })

  it('compara con el mayor id, no con el último de la lista', () => {
    expect(isChatBehindKnownMessage(msgs(12, 10, 11), 12)).toBe(false)
    expect(isChatBehindKnownMessage(msgs(12, 10, 11), 13)).toBe(true)
  })

  it.each([undefined, 0, -1])('sin id conocido (%s) no espera', (known) => {
    expect(isChatBehindKnownMessage(msgs(10), known)).toBe(false)
  })

  it('sin mensajes guardados no hay con qué comparar (la carga normal ya muestra el esqueleto)', () => {
    expect(isChatBehindKnownMessage([], 99)).toBe(false)
  })
})

describe('waitAtMost', () => {
  afterEach(() => vi.useRealTimers())

  it('vuelve en cuanto termina la promesa, sin esperar al plazo', async () => {
    vi.useFakeTimers()
    let done = false
    const waiting = waitAtMost(Promise.resolve('listo'), BEHIND_KNOWN_MAX_WAIT_MS).then(() => {
      done = true
    })

    await vi.advanceTimersByTimeAsync(0)
    await waiting

    expect(done).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('si la promesa tarda más que el plazo vuelve igualmente al cumplirse', async () => {
    vi.useFakeTimers()
    let done = false
    const waiting = waitAtMost(new Promise(() => {}), 6_000).then(() => {
      done = true
    })

    await vi.advanceTimersByTimeAsync(5_999)
    expect(done).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await waiting
    expect(done).toBe(true)
  })

  it('una promesa que falla no se propaga', async () => {
    await expect(waitAtMost(Promise.reject(new Error('red caída')), 1_000)).resolves.toBeUndefined()
  })

  it('el plazo de espera del esqueleto es corto', () => {
    expect(BEHIND_KNOWN_MAX_WAIT_MS).toBeLessThanOrEqual(8_000)
  })
})
