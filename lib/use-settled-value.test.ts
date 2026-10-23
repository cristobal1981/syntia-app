import { describe, expect, it } from 'vitest'

import { syncSettledState, type SettledState } from '@/lib/use-settled-value'

const state = (settled: number, wasEnabled: boolean): SettledState<number> => ({ settled, wasEnabled })

describe('syncSettledState', () => {
  it('al activarse (abrir el panel) se sincroniza al instante con el valor actual, sin esperar', () => {
    expect(syncSettledState(state(1, false), { value: 7, enabled: true })).toEqual(state(7, true))
  })

  it('al desactivarse (cerrar) también se sincroniza', () => {
    expect(syncSettledState(state(1, true), { value: 7, enabled: false })).toEqual(state(7, false))
  })

  it('desactivado, sigue al valor sin más, sin retraso', () => {
    expect(syncSettledState(state(1, false), { value: 2, enabled: false })).toEqual(state(2, false))
  })

  it('activo y con el valor cambiando, el asentado se queda atrás (eso es lo que se espera)', () => {
    const before = state(1, true)
    expect(syncSettledState(before, { value: 2, enabled: true })).toBe(before)
    expect(syncSettledState(before, { value: 3, enabled: true })).toBe(before)
  })

  it('sin cambios devuelve el mismo estado (no provoca otro render)', () => {
    const before = state(1, true)
    expect(syncSettledState(before, { value: 1, enabled: true })).toBe(before)
    const closed = state(1, false)
    expect(syncSettledState(closed, { value: 1, enabled: false })).toBe(closed)
  })
})
