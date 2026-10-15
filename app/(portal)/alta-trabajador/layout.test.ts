import { beforeEach, describe, expect, it, vi } from 'vitest'

const { notFound, isProcedureTypeAvailable } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  isProcedureTypeAvailable: vi.fn(),
}))

vi.mock('next/navigation', () => ({ notFound, redirect: vi.fn() }))
vi.mock('@/src/modules/tramites/domain/procedure-ticket-types', () => ({
  isProcedureTypeAvailable,
}))
vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession: vi.fn() }))
vi.mock('@/src/modules/colaboradores/application/assert-section-access', () => ({
  assertSectionAccess: vi.fn(),
}))
vi.mock('@/src/modules/alta-trabajador/ui/alta-trabajador-layout-client', () => ({
  AltaTrabajadorLayoutClient: () => null,
}))

import AltaTrabajadorLayout from '@/app/(portal)/alta-trabajador/layout'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('/alta-trabajador (desactivada a propósito)', () => {
  it('responde 404 en todo el wizard mientras el alta no esté disponible', () => {
    isProcedureTypeAvailable.mockReturnValue(false)

    expect(() => AltaTrabajadorLayout({ children: null })).toThrow('NEXT_NOT_FOUND')
    expect(isProcedureTypeAvailable).toHaveBeenCalledWith('alta-trabajador')
  })

  it('con el alta reactivada no bloquea la ruta', () => {
    isProcedureTypeAvailable.mockReturnValue(true)

    expect(() => AltaTrabajadorLayout({ children: null })).not.toThrow()
    expect(notFound).not.toHaveBeenCalled()
  })
})
