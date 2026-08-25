import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  cloneTramitesListSeenStateForUser,
  fetchTramitesListSeenState,
  upsertTramitesListSeenState,
} from '@/src/modules/tramites/infrastructure/tramites-list-seen-state.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

function chainFor(result: QueryResult) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = vi.fn(() => chain)
  chain.maybeSingle = () => resolved
  chain.upsert = vi.fn(() => resolved)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('fetchTramitesListSeenState', () => {
  it('returns null (not an error) when the user has no seen-state row yet', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: null }),
    })

    expect(await fetchTramitesListSeenState('u1')).toBeNull()
  })

  it('DEFENSIVE: coerces a malformed (non-array) open_item_keys column to an empty array rather than crashing', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: { open_item_keys: 'not-an-array', initialized: true }, error: null }),
    })

    const result = await fetchTramitesListSeenState('u1')

    expect(result?.openItemKeys).toEqual([])
  })

  it('coerces a truthy-but-non-boolean initialized column to a real boolean', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: { open_item_keys: [], initialized: 1 }, error: null }),
    })

    const result = await fetchTramitesListSeenState('u1')

    expect(result?.initialized).toBe(true)
  })

  it('scopes the lookup to the given user', async () => {
    const chain = chainFor({ data: null, error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await fetchTramitesListSeenState('u1')

    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(fetchTramitesListSeenState('u1')).rejects.toThrow('boom')
  })
})

describe('cloneTramitesListSeenStateForUser (titular → colaborador baseline inheritance)', () => {
  it('copies the openItemKeys and forces initialized: true on the destination user', async () => {
    const fetchChain = chainFor({
      data: { open_item_keys: ['task:1', 'task:2'], initialized: true },
      error: null,
    })
    const upsertChain = chainFor({ error: null })
    createSupabaseAdminClient
      .mockReturnValueOnce({ from: () => fetchChain })
      .mockReturnValueOnce({ from: () => upsertChain })

    await cloneTramitesListSeenStateForUser('owner-1', 'worker-1')

    expect(fetchChain.eq).toHaveBeenCalledWith('user_id', 'owner-1')
    expect(upsertChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'worker-1',
        open_item_keys: ['task:1', 'task:2'],
        initialized: true,
      }),
      { onConflict: 'user_id' }
    )
  })

  it('IMPORTANT: is a no-op when the titular has no state row at all — nothing to inherit', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: null }),
    })

    await cloneTramitesListSeenStateForUser('owner-1', 'worker-1')

    // Only ONE createSupabaseAdminClient call — the fetch. No second call for an upsert.
    expect(createSupabaseAdminClient).toHaveBeenCalledTimes(1)
  })

  it('IMPORTANT: is ALSO a no-op when the titular has a row but it was never marked initialized — avoids inheriting a bogus/half-baked baseline', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: { open_item_keys: ['x'], initialized: false }, error: null }),
    })

    await cloneTramitesListSeenStateForUser('owner-1', 'worker-1')

    expect(createSupabaseAdminClient).toHaveBeenCalledTimes(1)
  })
})

describe('upsertTramitesListSeenState', () => {
  it('upserts keyed on user_id, always forcing initialized: true', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertTramitesListSeenState('u1', ['task:1'])

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        open_item_keys: ['task:1'],
        initialized: true,
      }),
      { onConflict: 'user_id' }
    )
  })

  it('throws on a DB error', async () => {
    const chain = chainFor({ error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await expect(upsertTramitesListSeenState('u1', [])).rejects.toThrow('boom')
  })
})
