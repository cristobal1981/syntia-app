import { beforeEach, describe, expect, it, vi } from 'vitest'

const { validateOnboardingToken, validateAltaAutonomoSubmission, createAltaAutonomoInOdoo, markUsed } =
  vi.hoisted(() => ({
    validateOnboardingToken: vi.fn(),
    validateAltaAutonomoSubmission: vi.fn(),
    createAltaAutonomoInOdoo: vi.fn(),
    markUsed: vi.fn(),
  }))

vi.mock('@/src/modules/onboarding/validate-onboarding-token', () => ({ validateOnboardingToken }))
vi.mock('@/lib/onboarding/validate-submission', () => ({ validateAltaAutonomoSubmission }))
vi.mock('@/src/modules/onboarding/odoo-alta-autonomo-repository', () => ({ createAltaAutonomoInOdoo }))
vi.mock('@/src/modules/onboarding/onboarding-token-repository.supabase', () => ({
  markOnboardingFormAccessTokenUsed: markUsed,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  ODOO_ERROR: {
    NOT_CONFIGURED: 'ODOO_NOT_CONFIGURED',
    REQUEST_FAILED: 'ODOO_REQUEST_FAILED',
    RATE_LIMITED: 'ODOO_RATE_LIMITED',
  },
  resolveOdooErrorCode: () => 'odoo_unavailable',
}))

import { submitAltaAutonomo } from '@/src/modules/onboarding/submit-alta-autonomo'

const input = { token: 'tok-1', payload: { email: 'a@b.es' } }

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  validateOnboardingToken.mockResolvedValue({
    ok: true,
    token: { token: 'tok-1', recipient_email: null },
  })
  validateAltaAutonomoSubmission.mockReturnValue({ ok: true, data: { email: 'a@b.es' } })
  createAltaAutonomoInOdoo.mockResolvedValue(321)
  markUsed.mockResolvedValue(true)
})

describe('submitAltaAutonomo', () => {
  it('crea el alta y consume el token una sola vez', async () => {
    const result = await submitAltaAutonomo(input)

    expect(result).toEqual({ ok: true, odooRecordId: 321 })
    expect(markUsed).toHaveBeenCalledTimes(1)
    expect(markUsed).toHaveBeenCalledWith('tok-1')
  })

  it('si Odoo falla, devuelve error y NO consume el token (el enlace sigue siendo reutilizable)', async () => {
    createAltaAutonomoInOdoo.mockRejectedValue(new Error('ODOO_ALTA_AUTONOMO_CREATE_FAILED'))

    const result = await submitAltaAutonomo(input)

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(markUsed).not.toHaveBeenCalled()
  })

  it('REGRESIÓN: si el alta ya se creó y consumir el token lanza, NO devuelve error (evita el duplicado al reintentar)', async () => {
    markUsed.mockRejectedValue(new Error('db down'))

    const result = await submitAltaAutonomo(input)

    expect(result).toEqual({ ok: true, odooRecordId: 321 })
    expect(createAltaAutonomoInOdoo).toHaveBeenCalledTimes(1)
  })

  it('REGRESIÓN: si el alta ya se creó y el token ya no estaba disponible (false), tampoco devuelve error', async () => {
    markUsed.mockResolvedValue(false)

    const result = await submitAltaAutonomo(input)

    expect(result).toEqual({ ok: true, odooRecordId: 321 })
  })

  it('reintenta una vez el consumo del token si el primer intento lanza', async () => {
    markUsed.mockRejectedValueOnce(new Error('blip')).mockResolvedValueOnce(true)

    const result = await submitAltaAutonomo(input)

    expect(result).toEqual({ ok: true, odooRecordId: 321 })
    expect(markUsed).toHaveBeenCalledTimes(2)
  })

  it('deja constancia en el log con el id del alta cuando no se pudo consumir el token', async () => {
    markUsed.mockRejectedValue(new Error('db down'))

    await submitAltaAutonomo(input)

    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('alta creada'),
      expect.objectContaining({ odooRecordId: 321 })
    )
  })
})
