import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession, PortalUser } from '@/src/modules/auth/domain/types'
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
  vi.clearAllMocks()
  cookies.mockResolvedValue({ get: () => ({ value: 'fake-token' }) })
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
})
