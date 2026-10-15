import { beforeEach, describe, expect, it, vi } from 'vitest'

const { validateOnboardingToken, getOnboardingAddressCatalog } = vi.hoisted(() => ({
  validateOnboardingToken: vi.fn(),
  getOnboardingAddressCatalog: vi.fn(),
}))

vi.mock('@/src/modules/onboarding/validate-onboarding-token', () => ({ validateOnboardingToken }))
vi.mock('@/src/modules/onboarding/onboarding-address-catalog', () => ({
  getOnboardingAddressCatalog,
}))

import { GET } from '@/app/api/onboarding/alta-autonomo/validate/route'

function request(secret: string | null, token = 'tok-1'): Request {
  const headers = new Headers()
  if (secret !== null) headers.set('x-landing-onboarding-secret', secret)
  return new Request(`https://portal.example/api/onboarding/alta-autonomo/validate?token=${token}`, {
    headers,
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('LANDING_ONBOARDING_API_SECRET', 'secreto-correcto')
  validateOnboardingToken.mockResolvedValue({
    ok: true,
    token: { recipient_email: 'a@b.es', expires_at: '2026-12-31T00:00:00Z' },
  })
  getOnboardingAddressCatalog.mockResolvedValue({ countries: [] })
})

describe('GET /api/onboarding/alta-autonomo/validate (secreto)', () => {
  it('con el secreto correcto responde 200 y valida el token', async () => {
    const response = await GET(request('secreto-correcto'))

    expect(response.status).toBe(200)
    expect(validateOnboardingToken).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['sin cabecera', null],
    ['secreto distinto de igual longitud', 'secreto-incorrec'],
    ['secreto más corto', 'secreto'],
    ['prefijo del correcto', 'secreto-correct'],
    ['cabecera vacía', ''],
  ])('%s → 401 sin tocar el token', async (_label, header) => {
    const response = await GET(request(header))

    expect(response.status).toBe(401)
    expect(validateOnboardingToken).not.toHaveBeenCalled()
  })

  it('si el entorno no tiene secreto, rechaza aunque la cabecera venga vacía', async () => {
    vi.stubEnv('LANDING_ONBOARDING_API_SECRET', '')

    const response = await GET(request(''))

    expect(response.status).toBe(401)
    expect(validateOnboardingToken).not.toHaveBeenCalled()
  })
})
