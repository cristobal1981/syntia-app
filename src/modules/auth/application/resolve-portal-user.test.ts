import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import {
  refreshPortalUser,
  resolvePortalUser,
} from '@/src/modules/auth/application/resolve-portal-user'

const { createSupabaseAdminClient, isSupabaseServiceRoleConfigured } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
  isSupabaseServiceRoleConfigured,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

/**
 * `resolve-portal-user.ts` creates ONE Supabase client per internal helper
 * call (fetchPortalAccount / linkAuthUserId / activatePortalAccountIfInvited
 * / fetchProfileName), and `fetchPortalAccount` REUSES its single client for
 * up to two sequential queries (auth_user_id lookup, then an email
 * fallback) — so each mocked "client" needs its own queue of results, one
 * per `.maybeSingle()`/await it will actually serve.
 */
function makeClient(...results: QueryResult[]) {
  const queue = [...results]
  const nextResult = () => Promise.resolve(queue.shift() ?? { data: null, error: null })
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.update = () => chain
  chain.eq = () => chain
  chain.maybeSingle = () => nextResult()
  chain.then = (resolve: (v: QueryResult) => void, reject: (e: unknown) => void) =>
    nextResult().then(resolve, reject)
  return { from: () => chain }
}

function queueClients(...clients: QueryResult[][]) {
  for (const results of clients) {
    createSupabaseAdminClient.mockReturnValueOnce(makeClient(...results))
  }
}

function fallbackUser(overrides: Partial<PortalUser> = {}): PortalUser {
  return {
    id: 'auth-1',
    email: 'user@example.com',
    name: 'Fallback Name',
    role: 'client',
    ...overrides,
  }
}

function accountRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'portal-1',
    email: 'user@example.com',
    role: 'client',
    auth_user_id: 'auth-1',
    status: 'active',
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  isSupabaseServiceRoleConfigured.mockReturnValue(true)
})

describe('resolvePortalUser', () => {
  it('returns the fallback untouched when the service role is not configured, without any DB call', async () => {
    isSupabaseServiceRoleConfigured.mockReturnValue(false)
    const fallback = fallbackUser()

    const result = await resolvePortalUser('auth-1', 'user@example.com', fallback)

    expect(result).toBe(fallback)
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('FIXED 2026-08-25: denies access (returns null) when the portal `users` row is gone entirely — account deletion now kills the session instead of leaving a stale fallback alive', async () => {
    queueClients([
      { data: null, error: null }, // lookup by auth_user_id: miss
      { data: null, error: null }, // lookup by email: miss (same reused client)
    ])
    const fallback = fallbackUser({ role: 'admin' })

    const result = await resolvePortalUser('auth-1', 'user@example.com', fallback)

    expect(result).toBeNull()
  })

  it('FIXED 2026-08-25: denies access (returns null) when the account status is exactly "archived" — data stays, access does not', async () => {
    queueClients([{ data: accountRow({ status: 'archived' }), error: null }])

    const result = await resolvePortalUser('auth-1', 'user@example.com', fallbackUser())

    expect(result).toBeNull()
    // No link/activate/profile calls happen once we know the account is archived.
    expect(createSupabaseAdminClient).toHaveBeenCalledTimes(1)
  })

  it('archived-status matching is case-insensitive', async () => {
    queueClients([{ data: accountRow({ status: 'ARCHIVED' }), error: null }])

    const result = await resolvePortalUser('auth-1', 'user@example.com', fallbackUser())

    expect(result).toBeNull()
  })

  it('resolves role/name/company from the DB account + profile when found by auth_user_id', async () => {
    queueClients(
      [{ data: accountRow(), error: null }], // hit on the first (auth_user_id) query, no email fallback needed
      [
        {
          data: {
            first_name: 'Ada',
            first_surname: 'Lovelace',
            second_surname: '',
            company_name: null,
          },
          error: null,
        },
      ] // fetchProfileName
    )

    const result = await resolvePortalUser('auth-1', 'user@example.com', fallbackUser())

    expect(result).not.toBeNull()
    expect(result?.role).toBe('client')
    expect(result?.name).toBe('Ada Lovelace')
  })

  it('FIXED 2026-08-25: an unparseable/blank role in the DB now denies access outright instead of falling back to the previous session role — a corrupted role column no longer preserves elevated access', async () => {
    queueClients([{ data: accountRow({ role: 'not-a-real-role' }), error: null }]) // garbage/corrupted value, no further calls expected
    const staleAdminFallback = fallbackUser({ role: 'admin' })

    const result = await resolvePortalUser('auth-1', 'user@example.com', staleAdminFallback)

    expect(result).toBeNull()
    // Denied right after reading the role — never links, activates, or fetches a profile.
    expect(createSupabaseAdminClient).toHaveBeenCalledTimes(1)
  })

  it('an empty/null role in the DB also denies access (same as any other unparseable value)', async () => {
    queueClients([{ data: accountRow({ role: '' }), error: null }])

    const result = await resolvePortalUser('auth-1', 'user@example.com', fallbackUser())

    expect(result).toBeNull()
  })

  it('links the auth_user_id onto the account only when it is missing', async () => {
    queueClients(
      [{ data: accountRow({ auth_user_id: null }), error: null }], // not yet linked
      [{ error: null }], // linkAuthUserId's update call
      [{ data: null, error: null }] // fetchProfileName
    )

    const result = await resolvePortalUser('auth-1', 'user@example.com', fallbackUser())

    expect(result).not.toBeNull()
    expect(result?.role).toBe('client')
    // Three distinct client creations: account lookup, link, profile lookup.
    expect(createSupabaseAdminClient).toHaveBeenCalledTimes(3)
  })

  it('does NOT re-link when auth_user_id is already present', async () => {
    queueClients(
      [{ data: accountRow(), error: null }],
      [{ data: null, error: null }] // fetchProfileName
    )

    await resolvePortalUser('auth-1', 'user@example.com', fallbackUser())

    // Only 2 calls: account lookup + profile. No link, no activate (already active).
    expect(createSupabaseAdminClient).toHaveBeenCalledTimes(2)
  })

  it('activates a non-active, non-archived status (e.g. an arbitrary "suspended" string) on every resolve — ONLY the literal "archived" value blocks; anything else force-activates exactly like "invited" always did', async () => {
    queueClients(
      [{ data: accountRow({ status: 'suspended' }), error: null }],
      [{ error: null }], // activatePortalAccountIfInvited's update call
      [{ data: null, error: null }] // fetchProfileName
    )

    const result = await resolvePortalUser('auth-1', 'user@example.com', fallbackUser())

    expect(result).not.toBeNull()
    // 3 calls: account lookup, activate, profile — the activate call fired for
    // "suspended" exactly the same way it would for "invited".
    expect(createSupabaseAdminClient).toHaveBeenCalledTimes(3)
  })

  it('falls back to email lookup (and auto-links) only when the auth_user_id lookup misses', async () => {
    queueClients(
      [
        { data: null, error: null }, // by auth_user_id: miss
        { data: accountRow({ role: 'worker', auth_user_id: null }), error: null }, // by email (same reused client): hit
      ],
      [{ error: null }], // linkAuthUserId
      [{ data: null, error: null }] // fetchProfileName
    )

    const result = await resolvePortalUser('auth-1', 'USER@Example.com', fallbackUser())

    expect(result).not.toBeNull()
    expect(result?.role).toBe('worker')
  })

  it('throws (does not silently swallow) on a genuine DB error during account lookup', async () => {
    queueClients([{ data: null, error: { message: 'connection reset' } }])

    await expect(
      resolvePortalUser('auth-1', 'user@example.com', fallbackUser())
    ).rejects.toThrow('connection reset')
  })
})

describe('refreshPortalUser', () => {
  it('uses the CURRENT session user as both id/email source and as the fallback', async () => {
    const current = fallbackUser({ id: 'auth-42', email: 'current@example.com', role: 'client' })
    queueClients(
      [{ data: accountRow({ id: 'portal-42', auth_user_id: 'auth-42' }), error: null }],
      [{ data: null, error: null }] // fetchProfileName
    )

    const result = await refreshPortalUser(current)

    expect(result).not.toBeNull()
    expect(result?.role).toBe('client')
  })

  it('FIXED 2026-08-25: an archived account is kicked out on the very next getSession()-style refresh, not just blocked from a fresh login', async () => {
    const current = fallbackUser({ role: 'client' })
    queueClients([{ data: accountRow({ status: 'archived' }), error: null }])

    const result = await refreshPortalUser(current)

    expect(result).toBeNull()
  })
})
