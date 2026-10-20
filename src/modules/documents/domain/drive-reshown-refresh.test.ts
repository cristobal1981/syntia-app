import { describe, expect, it } from 'vitest'

import { createReshownRefreshGate } from '@/src/modules/documents/domain/drive-reshown-refresh'

describe('createReshownRefreshGate', () => {
  it('el primer montaje no pide refrescar', () => {
    const gate = createReshownRefreshGate()

    expect(gate.consumeReshown()).toBe(false)
  })

  it('al volver tras estar oculta pide refrescar una sola vez', () => {
    const gate = createReshownRefreshGate()
    gate.consumeReshown()

    gate.markHidden()

    expect(gate.consumeReshown()).toBe(true)
    expect(gate.consumeReshown()).toBe(false)
  })

  it('varios ciclos ocultar/mostrar piden refrescar cada vez', () => {
    const gate = createReshownRefreshGate()
    gate.consumeReshown()

    for (let i = 0; i < 3; i += 1) {
      gate.markHidden()
      expect(gate.consumeReshown()).toBe(true)
    }
  })

  it('ocultar varias veces seguidas sigue pidiendo un único refresco', () => {
    const gate = createReshownRefreshGate()
    gate.consumeReshown()

    gate.markHidden()
    gate.markHidden()

    expect(gate.consumeReshown()).toBe(true)
    expect(gate.consumeReshown()).toBe(false)
  })
})
