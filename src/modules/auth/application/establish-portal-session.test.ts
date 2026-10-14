import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  type PortalUser,
} from '@/src/modules/auth/domain/types'
import { establishPortalSession } from '@/src/modules/auth/application/establish-portal-session'

const { cookies, headers, createSessionToken, getSessionSecret, set, headerGet } = vi.hoisted(
  () => ({
    cookies: vi.fn(),
    headers: vi.fn(),
    createSessionToken: vi.fn(),
    getSessionSecret: vi.fn(),
    set: vi.fn(),
    headerGet: vi.fn(),
  })
)

vi.mock('next/headers', () => ({ cookies, headers }))
vi.mock('@/src/modules/auth/infrastructure/session-cookie', () => ({
  createSessionToken,
  getSessionSecret,
}))

const user: PortalUser = {
  id: 'auth-1',
  email: 'user@example.com',
  name: 'User',
  role: 'client',
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.unstubAllEnvs()
  cookies.mockResolvedValue({ set })
  headers.mockResolvedValue({ get: headerGet })
  headerGet.mockReturnValue(null)
  getSessionSecret.mockReturnValue('secret')
  createSessionToken.mockResolvedValue('signed-token')
})

describe('establishPortalSession', () => {
  it('firma la sesión con el secreto, el usuario y expiresAt = ahora + max age', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-01T00:00:00Z'))
    try {
      await establishPortalSession(user)

      const [session, secret] = createSessionToken.mock.calls[0]
      expect(secret).toBe('secret')
      expect(session.user).toBe(user)
      expect(session.expiresAt).toBe(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)
    } finally {
      vi.useRealTimers()
    }
  })

  it('escribe la cookie con httpOnly, sameSite lax, path / y maxAge', async () => {
    await establishPortalSession(user)

    expect(set).toHaveBeenCalledWith(
      SESSION_COOKIE_NAME,
      'signed-token',
      expect.objectContaining({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: SESSION_MAX_AGE_SECONDS,
      })
    )
  })

  it('secure=true si x-forwarded-proto es https (aunque NODE_ENV no sea production)', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    headerGet.mockReturnValue('https')

    await establishPortalSession(user)

    expect(set.mock.calls[0][2].secure).toBe(true)
  })

  it('secure=false si x-forwarded-proto es http aunque NODE_ENV sea production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    headerGet.mockReturnValue('http')

    await establishPortalSession(user)

    expect(set.mock.calls[0][2].secure).toBe(false)
  })

  it('usa solo el primer valor de una lista x-forwarded-proto ("https, http")', async () => {
    headerGet.mockReturnValue('https, http')
    await establishPortalSession(user)
    expect(set.mock.calls[0][2].secure).toBe(true)

    vi.resetAllMocks()
    cookies.mockResolvedValue({ set })
    headers.mockResolvedValue({ get: headerGet })
    getSessionSecret.mockReturnValue('secret')
    createSessionToken.mockResolvedValue('signed-token')
    headerGet.mockReturnValue('http, https')
    await establishPortalSession(user)
    expect(set.mock.calls[0][2].secure).toBe(false)
  })

  it('sin x-forwarded-proto cae a NODE_ENV: production -> secure, otro -> no', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    await establishPortalSession(user)
    expect(set.mock.calls[0][2].secure).toBe(true)

    set.mockClear()
    vi.stubEnv('NODE_ENV', 'development')
    await establishPortalSession(user)
    expect(set.mock.calls[0][2].secure).toBe(false)
  })

  it('no escribe cookie si falta el secreto (getSessionSecret lanza)', async () => {
    getSessionSecret.mockImplementation(() => {
      throw new Error('PORTAL_SESSION_SECRET no está configurada')
    })

    await expect(establishPortalSession(user)).rejects.toThrow(/PORTAL_SESSION_SECRET/)
    expect(set).not.toHaveBeenCalled()
  })
})
