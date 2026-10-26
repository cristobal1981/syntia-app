import { describe, expect, it } from 'vitest'

import { nextClientStatus } from '@/src/modules/directory/domain/client-status'

describe('nextClientStatus (interruptor «Cuenta activa»)', () => {
  it.each(['active', 'invited', 'archived'] as const)('desactivar archiva desde «%s»', (current) => {
    expect(nextClientStatus(current, false)).toBe('archived')
  })

  it('activar una cuenta activa o invitada deja su estado (no la vuelve a invitar)', () => {
    expect(nextClientStatus('active', true)).toBe('active')
    expect(nextClientStatus('invited', true)).toBe('invited')
  })

  it('activar una cuenta archivada la vuelve a invitar (pasará a activa al entrar)', () => {
    expect(nextClientStatus('archived', true)).toBe('invited')
  })

  it('sin estado previo, activar la deja invitada', () => {
    expect(nextClientStatus(undefined, true)).toBe('invited')
  })
})
