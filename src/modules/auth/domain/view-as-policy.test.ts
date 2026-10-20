import { describe, expect, it } from 'vitest'

import { canStaffViewClient, isWriteMethod } from '@/src/modules/auth/domain/view-as-policy'

describe('canStaffViewClient', () => {
  it('admin ve a cualquier cliente, con o sin asesor', () => {
    expect(canStaffViewClient({ role: 'admin', actorId: 'a1' }, { advisorId: 'otro' })).toBe(true)
    expect(canStaffViewClient({ role: 'admin', actorId: 'a1' }, { advisorId: null })).toBe(true)
  })

  it('asesor solo ve a sus clientes', () => {
    expect(canStaffViewClient({ role: 'advisor', actorId: 'g1' }, { advisorId: 'g1' })).toBe(true)
    expect(canStaffViewClient({ role: 'advisor', actorId: 'g1' }, { advisorId: 'g2' })).toBe(false)
  })

  it('asesor no ve a un cliente sin asesor, ni con id vacío igual al suyo', () => {
    expect(canStaffViewClient({ role: 'advisor', actorId: 'g1' }, { advisorId: null })).toBe(false)
    expect(canStaffViewClient({ role: 'advisor', actorId: 'g1' }, {})).toBe(false)
    expect(canStaffViewClient({ role: 'advisor', actorId: '' }, { advisorId: '' })).toBe(false)
  })

  it('cliente y colaborador no pueden ver a nadie', () => {
    expect(canStaffViewClient({ role: 'client', actorId: 'c1' }, { advisorId: 'c1' })).toBe(false)
    expect(canStaffViewClient({ role: 'worker', actorId: 'w1' }, { advisorId: 'w1' })).toBe(false)
  })
})

describe('isWriteMethod', () => {
  it.each(['GET', 'HEAD', 'OPTIONS', 'get'])('%s es lectura', (m) => {
    expect(isWriteMethod(m)).toBe(false)
  })
  it.each(['POST', 'PUT', 'PATCH', 'DELETE', 'post'])('%s es escritura', (m) => {
    expect(isWriteMethod(m)).toBe(true)
  })
})
