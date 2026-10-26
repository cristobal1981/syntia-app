import { describe, expect, it } from 'vitest'

import { nextClientStatus } from '@/src/modules/directory/domain/client-status'

describe('nextClientStatus (activar o desactivar la cuenta)', () => {
  it.each(['active', 'invited', 'archived'] as const)('desactivar archiva desde «%s»', (current) => {
    expect(nextClientStatus(current, false)).toBe('archived')
    expect(nextClientStatus(current, false, true)).toBe('archived')
  })

  it('activar una cuenta activa o invitada deja su estado', () => {
    expect(nextClientStatus('active', true)).toBe('active')
    expect(nextClientStatus('invited', true)).toBe('invited')
    expect(nextClientStatus('invited', true, true)).toBe('invited')
  })

  it('activar una archivada que ya tenía cuenta de acceso la devuelve a activa (puede entrar ya)', () => {
    expect(nextClientStatus('archived', true, true)).toBe('active')
  })

  it('activar una archivada que nunca llegó a entrar la deja invitada', () => {
    expect(nextClientStatus('archived', true, false)).toBe('invited')
    expect(nextClientStatus('archived', true)).toBe('invited')
  })

  it('sin estado previo, activar la deja invitada o activa según tenga cuenta de acceso', () => {
    expect(nextClientStatus(undefined, true)).toBe('invited')
    expect(nextClientStatus(undefined, true, true)).toBe('active')
  })
})
