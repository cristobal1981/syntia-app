import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { OnboardingFormAccessToken } from '@/src/modules/onboarding/onboarding-token-repository.supabase'
import { validateOnboardingToken } from '@/src/modules/onboarding/validate-onboarding-token'

const { getOnboardingFormAccessTokenByToken } = vi.hoisted(() => ({
  getOnboardingFormAccessTokenByToken: vi.fn(),
}))

vi.mock('@/src/modules/onboarding/onboarding-token-repository.supabase', () => ({
  getOnboardingFormAccessTokenByToken,
}))

function record(overrides: Partial<OnboardingFormAccessToken> = {}) {
  return {
    id: 1,
    token: 'tok',
    form_kind: 'alta_autonomo',
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    used_at: null,
    revoked_at: null,
    ...overrides,
  } as OnboardingFormAccessToken
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('validateOnboardingToken', () => {
  it('token vacío o en blanco: not_found sin consultar', async () => {
    expect(await validateOnboardingToken({ token: '   ' })).toEqual({
      ok: false,
      error: 'not_found',
    })
    expect(getOnboardingFormAccessTokenByToken).not.toHaveBeenCalled()
  })

  it('recorta el token antes de consultar', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(record())
    await validateOnboardingToken({ token: '  tok \n' })
    expect(getOnboardingFormAccessTokenByToken).toHaveBeenCalledWith('tok')
  })

  it('no existe: not_found', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(null)
    expect(await validateOnboardingToken({ token: 'x' })).toEqual({
      ok: false,
      error: 'not_found',
    })
  })

  it('form_kind distinto: not_found (no revela existencia), aunque esté usado', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      record({
        form_kind: 'otro' as OnboardingFormAccessToken['form_kind'],
        used_at: '2026-01-01T00:00:00.000Z',
      })
    )
    expect(await validateOnboardingToken({ token: 'x' })).toEqual({
      ok: false,
      error: 'not_found',
    })
  })

  it('expectedFormKind explícito se respeta', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(record())
    const r = await validateOnboardingToken({
      token: 'x',
      expectedFormKind: 'otro' as OnboardingFormAccessToken['form_kind'],
    })
    expect(r).toEqual({ ok: false, error: 'not_found' })
  })

  it('revocado', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      record({ revoked_at: '2026-01-01T00:00:00.000Z' })
    )
    expect(await validateOnboardingToken({ token: 'x' })).toEqual({
      ok: false,
      error: 'revoked',
    })
  })

  it('usado', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      record({ used_at: '2026-01-01T00:00:00.000Z' })
    )
    expect(await validateOnboardingToken({ token: 'x' })).toEqual({
      ok: false,
      error: 'used',
    })
  })

  it('revocado y usado: prevalece revoked', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      record({
        used_at: '2026-01-01T00:00:00.000Z',
        revoked_at: '2026-01-02T00:00:00.000Z',
      })
    )
    expect(await validateOnboardingToken({ token: 'x' })).toEqual({
      ok: false,
      error: 'revoked',
    })
  })

  it('caducado', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      record({ expires_at: '2020-01-01T00:00:00.000Z' })
    )
    expect(await validateOnboardingToken({ token: 'x' })).toEqual({
      ok: false,
      error: 'expired',
    })
  })

  it('caduca exactamente ahora: expired (<=)', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'))
    try {
      getOnboardingFormAccessTokenByToken.mockResolvedValue(
        record({ expires_at: '2026-06-15T12:00:00.000Z' })
      )
      expect(await validateOnboardingToken({ token: 'x' })).toEqual({
        ok: false,
        error: 'expired',
      })
      getOnboardingFormAccessTokenByToken.mockResolvedValue(
        record({ expires_at: '2026-06-15T12:00:00.001Z' })
      )
      expect((await validateOnboardingToken({ token: 'x' })).ok).toBe(true)
    } finally {
      vi.useRealTimers()
    }
  })

  it('expires_at ilegible: expired', async () => {
    getOnboardingFormAccessTokenByToken.mockResolvedValue(
      record({ expires_at: 'no-es-fecha' })
    )
    expect(await validateOnboardingToken({ token: 'x' })).toEqual({
      ok: false,
      error: 'expired',
    })
  })

  it('activo: ok con el registro', async () => {
    const rec = record()
    getOnboardingFormAccessTokenByToken.mockResolvedValue(rec)
    expect(await validateOnboardingToken({ token: 'x' })).toEqual({ ok: true, token: rec })
  })

  it('propaga errores del repositorio', async () => {
    getOnboardingFormAccessTokenByToken.mockRejectedValue(new Error('db'))
    await expect(validateOnboardingToken({ token: 'x' })).rejects.toThrow('db')
  })
})
