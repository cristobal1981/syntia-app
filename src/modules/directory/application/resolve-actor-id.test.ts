import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

/**
 * `resolveDirectoryActorId` creates ONE Supabase client and reuses it for
 * both the auth_user_id lookup and (if needed) the email fallback lookup —
 * so a single mocked client needs a queue of up to two results.
 */
function mockClient(...results: QueryResult[]) {
  const queue = [...results]
  const nextResult = () => Promise.resolve(queue.shift() ?? { data: null, error: null })
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = () => chain
  chain.maybeSingle = () => nextResult()
  createSupabaseAdminClient.mockReturnValue({ from: () => chain })
}

function user(overrides: Partial<PortalUser> = {}): PortalUser {
  return {
    id: 'auth-uid-1',
    email: 'user@example.com',
    name: 'User',
    role: 'client',
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('resolveDirectoryActorId', () => {
  it('returns the portal id matched by auth_user_id, without needing the email fallback', async () => {
    mockClient({ data: { id: 'portal-1' }, error: null })

    const result = await resolveDirectoryActorId(user())

    expect(result).toBe('portal-1')
  })

  it('falls back to matching by (lowercased) email when the auth_user_id lookup misses', async () => {
    mockClient(
      { data: null, error: null },
      { data: { id: 'portal-2' }, error: null }
    )

    const result = await resolveDirectoryActorId(user({ email: 'USER@Example.com' }))

    expect(result).toBe('portal-2')
  })

  it('treats a falsy/empty id from the auth_user_id match as a miss, not a hit', async () => {
    mockClient(
      { data: { id: '' }, error: null },
      { data: { id: 'portal-3' }, error: null }
    )

    const result = await resolveDirectoryActorId(user())

    expect(result).toBe('portal-3')
  })

  it('FAILS SAFE: falls back to the raw auth uid when no portal row matches by either auth_user_id or email — not someone else\'s row', async () => {
    mockClient({ data: null, error: null }, { data: null, error: null })

    const result = await resolveDirectoryActorId(user({ id: 'orphan-auth-uid' }))

    expect(result).toBe('orphan-auth-uid')
  })

  it('throws on a genuine DB error during the auth_user_id lookup, rather than silently falling through', async () => {
    mockClient({ data: null, error: { message: 'connection reset' } })

    await expect(resolveDirectoryActorId(user())).rejects.toThrow('connection reset')
  })

  it('throws on a genuine DB error during the email fallback lookup', async () => {
    mockClient(
      { data: null, error: null },
      { data: null, error: { message: 'connection reset' } }
    )

    await expect(resolveDirectoryActorId(user())).rejects.toThrow('connection reset')
  })
})
