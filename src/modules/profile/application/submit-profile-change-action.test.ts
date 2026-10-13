import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'

const { getSession, submitProfileChange } = vi.hoisted(() => ({
  getSession: vi.fn(),
  submitProfileChange: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/profile/application/submit-profile-change', async () => {
  const actual = await vi.importActual<
    typeof import('@/src/modules/profile/application/submit-profile-change')
  >('@/src/modules/profile/application/submit-profile-change')
  return {
    ...actual,
    submitProfileChange,
  }
})

import { submitProfileChangeAction } from '@/src/modules/profile/application/submit-profile-change-action'

function sessionFor(role: 'client' | 'worker' | 'admin' | 'advisor'): PortalSession {
  return {
    user: { id: `u-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100_000,
  }
}

function validBody(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: 'Nombre Apellido',
    email: 'cliente@example.com',
    phone: '600000000',
    vat: 'B12345678',
    iban: 'ES1234567890123456789012',
    address: {
      line1: 'Calle 1',
      line2: '',
      postalCode: '28001',
      city: 'Madrid',
      province: 'Madrid',
      country: 'España',
    },
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('submitProfileChangeAction', () => {
  it('rechaza sin sesión, sin llegar a llamar a submitProfileChange', async () => {
    getSession.mockResolvedValue(null)

    const result = await submitProfileChangeAction(validBody())

    expect(result).toEqual({ ok: false, error: 'unauthorized' })
    expect(submitProfileChange).not.toHaveBeenCalled()
  })

  it('rechaza un body con forma inválida (sin address), sin llamar a submitProfileChange', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await submitProfileChangeAction({ name: 'Solo nombre' })

    expect(result).toMatchObject({ ok: false, error: 'validation' })
    expect(submitProfileChange).not.toHaveBeenCalled()
  })

  it('rechaza un body que no es un objeto', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await submitProfileChangeAction('no soy un objeto')

    expect(result).toMatchObject({ ok: false, error: 'validation' })
    expect(submitProfileChange).not.toHaveBeenCalled()
  })

  it('delega en submitProfileChange con el usuario de la sesión y el body parseado', async () => {
    const session = sessionFor('client')
    getSession.mockResolvedValue(session)
    submitProfileChange.mockResolvedValue({ ok: true, ticketId: 42 })

    const result = await submitProfileChangeAction(validBody())

    expect(result).toEqual({ ok: true, ticketId: 42 })
    expect(submitProfileChange).toHaveBeenCalledTimes(1)
    expect(submitProfileChange).toHaveBeenCalledWith(
      session.user,
      expect.objectContaining({ name: 'Nombre Apellido', email: 'cliente@example.com' })
    )
  })

  it('propaga el error tal cual cuando submitProfileChange falla (no lo reescribe)', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    submitProfileChange.mockResolvedValue({
      ok: false,
      error: 'validation',
      fieldErrors: { email: 'Correo inválido.' },
    })

    const result = await submitProfileChangeAction(validBody())

    expect(result).toEqual({
      ok: false,
      error: 'validation',
      fieldErrors: { email: 'Correo inválido.' },
    })
  })

  it('no usa el usuario de la sesión como gate de rol — ese check vive en submitProfileChange', async () => {
    // El wrapper no debe filtrar por rol antes de delegar: eso es
    // responsabilidad de submitProfileChange (honeypot incluido). Un worker
    // debe llegar igual a submitProfileChange, que es quien decide.
    const session = sessionFor('worker')
    getSession.mockResolvedValue(session)
    submitProfileChange.mockResolvedValue({ ok: false, error: 'forbidden' })

    const result = await submitProfileChangeAction(validBody())

    expect(submitProfileChange).toHaveBeenCalledWith(session.user, expect.anything())
    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })
})
