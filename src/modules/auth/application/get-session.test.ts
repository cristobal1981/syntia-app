import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession, PortalUser } from '@/src/modules/auth/domain/types'
import { SESSION_COOKIE_NAME } from '@/src/modules/auth/domain/types'
import { getSession } from '@/src/modules/auth/application/get-session'

const {
  cookies,
  getSessionFromToken,
  refreshPortalUser,
  isSupabaseConfigured,
  isSupabaseServiceRoleConfigured,
  getWorkerAccessStatus,
} = vi.hoisted(() => ({
  cookies: vi.fn(),
  getSessionFromToken: vi.fn(),
  refreshPortalUser: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn(),
  getWorkerAccessStatus: vi.fn(),
}))

vi.mock('next/headers', () => ({ cookies }))
vi.mock('@/src/modules/auth/application/resolve-portal-user', () => ({ refreshPortalUser }))
vi.mock('@/src/modules/auth/infrastructure/supabase/env', () => ({ isSupabaseConfigured }))
vi.mock('@/src/modules/auth/infrastructure/session-cookie', () => ({ getSessionFromToken }))
vi.mock('@/src/modules/colaboradores/application/get-worker-access-status', () => ({
  getWorkerAccessStatus,
}))
vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  isSupabaseServiceRoleConfigured,
}))

function baseUser(overrides: Partial<PortalUser> = {}): PortalUser {
  return {
    id: 'auth-1',
    email: 'user@example.com',
    name: 'User One',
    role: 'client',
    ...overrides,
  }
}

function baseSession(overrides: Partial<PortalUser> = {}): PortalSession {
  return {
    user: baseUser(overrides),
    expiresAt: Date.now() + 1000 * 60 * 60,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  cookies.mockResolvedValue({
    get: (name: string) => (name === SESSION_COOKIE_NAME ? { value: 'fake-token' } : undefined),
  })
  isSupabaseConfigured.mockReturnValue(true)
  isSupabaseServiceRoleConfigured.mockReturnValue(true)
})

describe('getSession', () => {
  it('returns null when there is no cookie / an invalid token', async () => {
    getSessionFromToken.mockResolvedValue(null)

    const result = await getSession()

    expect(result).toBeNull()
    expect(refreshPortalUser).not.toHaveBeenCalled()
  })

  it('skips the worker-access check entirely when Supabase is not configured (documented current behavior)', async () => {
    const session = baseSession({ role: 'worker' })
    getSessionFromToken.mockResolvedValue(session)
    isSupabaseConfigured.mockReturnValue(false)

    const result = await getSession()

    expect(result).toBe(session)
    expect(getWorkerAccessStatus).not.toHaveBeenCalled()
  })

  it('never calls getWorkerAccessStatus for a client session', async () => {
    const session = baseSession({ role: 'client' })
    getSessionFromToken.mockResolvedValue(session)
    refreshPortalUser.mockResolvedValue(session.user)

    const result = await getSession()

    expect(result).toEqual(session)
    expect(getWorkerAccessStatus).not.toHaveBeenCalled()
  })

  it('invalidates the session (returns null) for a worker whose access has been revoked mid-session', async () => {
    const session = baseSession({ role: 'worker' })
    getSessionFromToken.mockResolvedValue(session)
    refreshPortalUser.mockResolvedValue(session.user)
    getWorkerAccessStatus.mockResolvedValue({ active: false, allowedSections: new Set() })

    const result = await getSession()

    expect(result).toBeNull()
  })

  it('keeps a worker session alive when access is still active', async () => {
    const session = baseSession({ role: 'worker' })
    getSessionFromToken.mockResolvedValue(session)
    refreshPortalUser.mockResolvedValue(session.user)
    getWorkerAccessStatus.mockResolvedValue({
      active: true,
      allowedSections: new Set(['/tramites']),
    })

    const result = await getSession()

    expect(result).toEqual(session)
  })

  it('checks the POST-REFRESH role, not the stale cookie role: a session that claims "client" but is actually a revoked worker in the DB gets invalidated', async () => {
    const staleSession = baseSession({ role: 'client' })
    getSessionFromToken.mockResolvedValue(staleSession)
    refreshPortalUser.mockResolvedValue(baseUser({ role: 'worker' }))
    getWorkerAccessStatus.mockResolvedValue({ active: false, allowedSections: new Set() })

    const result = await getSession()

    expect(result).toBeNull()
  })

  it('does not re-check worker access for someone who was promoted away from worker in the DB', async () => {
    const staleSession = baseSession({ role: 'worker' })
    getSessionFromToken.mockResolvedValue(staleSession)
    refreshPortalUser.mockResolvedValue(baseUser({ role: 'client' }))

    const result = await getSession()

    expect(getWorkerAccessStatus).not.toHaveBeenCalled()
    expect(result?.user.role).toBe('client')
  })

  it('FIXED 2026-08-25: invalidates the session for ANY role (not just worker) when refreshPortalUser denies access — e.g. an archived client account or one whose row was deleted', async () => {
    const session = baseSession({ role: 'client' })
    getSessionFromToken.mockResolvedValue(session)
    refreshPortalUser.mockResolvedValue(null)

    const result = await getSession()

    expect(result).toBeNull()
    // Never even gets to asking whether this is a worker — refreshPortalUser
    // already said "no" for everyone, workers included.
    expect(getWorkerAccessStatus).not.toHaveBeenCalled()
  })

  it('lee la cookie por su nombre y pasa su valor a getSessionFromToken', async () => {
    const get = vi.fn().mockReturnValue({ value: 'tok-123' })
    cookies.mockResolvedValue({ get })
    getSessionFromToken.mockResolvedValue(null)

    await getSession()

    expect(get).toHaveBeenCalledWith(SESSION_COOKIE_NAME)
    expect(getSessionFromToken).toHaveBeenCalledWith('tok-123')
  })

  it('sin cookie pasa undefined al validador y devuelve null', async () => {
    cookies.mockResolvedValue({ get: () => undefined })
    getSessionFromToken.mockResolvedValue(null)

    expect(await getSession()).toBeNull()
    expect(getSessionFromToken).toHaveBeenCalledWith(undefined)
  })

  it('devuelve la sesión sin revalidar si falta solo la service role (Supabase sí configurado)', async () => {
    const session = baseSession()
    getSessionFromToken.mockResolvedValue(session)
    isSupabaseServiceRoleConfigured.mockReturnValue(false)

    expect(await getSession()).toBe(session)
    expect(refreshPortalUser).not.toHaveBeenCalled()
  })

  it('revalida el usuario de la cookie contra BD (refreshPortalUser recibe session.user)', async () => {
    const session = baseSession()
    getSessionFromToken.mockResolvedValue(session)
    refreshPortalUser.mockResolvedValue(session.user)

    await getSession()

    expect(refreshPortalUser).toHaveBeenCalledWith(session.user)
  })

  it('devuelve el mismo objeto de sesión cuando nada cambió', async () => {
    const session = baseSession({ companyName: 'ACME' })
    getSessionFromToken.mockResolvedValue(session)
    refreshPortalUser.mockResolvedValue({ ...session.user })

    expect(await getSession()).toBe(session)
  })

  it.each([
    ['role', { role: 'admin' as const }],
    ['name', { name: 'Otro Nombre' }],
    ['email', { email: 'nuevo@example.com' }],
    ['companyName', { companyName: 'Nueva SL' }],
  ])('devuelve el usuario refrescado y conserva expiresAt si cambia %s', async (_f, change) => {
    const session = baseSession({ companyName: 'ACME' })
    getSessionFromToken.mockResolvedValue(session)
    const refreshed = { ...session.user, ...change }
    refreshPortalUser.mockResolvedValue(refreshed)

    const result = await getSession()

    expect(result).not.toBe(session)
    expect(result?.user).toEqual(refreshed)
    expect(result?.expiresAt).toBe(session.expiresAt)
  })

  it('pasa el usuario refrescado (no el de la cookie) a getWorkerAccessStatus', async () => {
    const session = baseSession({ role: 'worker' })
    getSessionFromToken.mockResolvedValue(session)
    const refreshed = baseUser({ role: 'worker', name: 'Refrescado' })
    refreshPortalUser.mockResolvedValue(refreshed)
    getWorkerAccessStatus.mockResolvedValue({ active: true, allowedSections: new Set() })

    await getSession()

    expect(getWorkerAccessStatus).toHaveBeenCalledWith(refreshed)
  })

  it('propaga el error de refreshPortalUser (no lo traga como sesión válida)', async () => {
    getSessionFromToken.mockResolvedValue(baseSession())
    refreshPortalUser.mockRejectedValue(new Error('db down'))

    await expect(getSession()).rejects.toThrow('db down')
  })
})
