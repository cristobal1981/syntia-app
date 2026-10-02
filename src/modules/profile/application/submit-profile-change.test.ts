import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import type { ProfileChangeRequestBody } from '@/src/modules/profile/domain/types'

const { getClientProfileForClient, resolveClientOdooPartnerId, createProfileChangeTicketInOdoo } =
  vi.hoisted(() => ({
    getClientProfileForClient: vi.fn(),
    resolveClientOdooPartnerId: vi.fn(),
    createProfileChangeTicketInOdoo: vi.fn(),
  }))

vi.mock('@/src/modules/profile/application/get-client-profile-for-client', () => ({
  getClientProfileForClient,
}))
vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({
  resolveClientOdooPartnerId,
}))
vi.mock('@/src/modules/profile/infrastructure/odoo-profile-change-repository', () => ({
  createProfileChangeTicketInOdoo,
}))

import { submitProfileChange } from '@/src/modules/profile/application/submit-profile-change'

function sessionUserFor(role: 'client' | 'worker' | 'admin' | 'advisor'): PortalSession['user'] {
  return { id: `u-${role}`, email: `${role}@example.com`, name: role, role }
}

function bodyWith(overrides: Partial<ProfileChangeRequestBody> = {}): ProfileChangeRequestBody {
  return {
    website: '',
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

describe('submitProfileChange — gate de honeypot', () => {
  it('devuelve ok:true sin tocar ningún dato si el honeypot "website" viene relleno', async () => {
    const result = await submitProfileChange(
      sessionUserFor('client'),
      bodyWith({ website: 'http://bot.example.com' })
    )

    expect(result).toEqual({ ok: true })
    expect(getClientProfileForClient).not.toHaveBeenCalled()
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
    expect(createProfileChangeTicketInOdoo).not.toHaveBeenCalled()
  })

  it('solo cuenta como relleno si tiene contenido real (trim), no espacios en blanco', async () => {
    getClientProfileForClient.mockResolvedValue({
      ok: false,
      error: 'forbidden',
    })

    const result = await submitProfileChange(sessionUserFor('client'), bodyWith({ website: '   ' }))

    // Con website solo-espacios, el honeypot NO debe activarse: debe seguir
    // el flujo normal (y aquí falla por el mock de perfil, no por honeypot).
    expect(result).not.toEqual({ ok: true })
    expect(getClientProfileForClient).toHaveBeenCalled()
  })
})

describe('submitProfileChange — gate de rol', () => {
  it('rechaza a un worker con forbidden, sin tocar el perfil ni Odoo', async () => {
    const result = await submitProfileChange(sessionUserFor('worker'), bodyWith())

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(getClientProfileForClient).not.toHaveBeenCalled()
  })

  it('rechaza a un admin con forbidden', async () => {
    const result = await submitProfileChange(sessionUserFor('admin'), bodyWith())

    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('rechaza a un advisor con forbidden', async () => {
    const result = await submitProfileChange(sessionUserFor('advisor'), bodyWith())

    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('un client sí llega a pedir su perfil', async () => {
    getClientProfileForClient.mockResolvedValue({ ok: false, error: 'not_linked' })

    const result = await submitProfileChange(sessionUserFor('client'), bodyWith())

    expect(getClientProfileForClient).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ ok: false, error: 'not_linked' })
  })
})
