import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  cloneChatterReadStateForUser,
  fetchChatterReadStateForUser,
  upsertChatterReadState,
  upsertChatterReadStateBatch,
} from '@/src/modules/portal/infrastructure/chatter-read-state.supabase'

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
  chain.upsert = vi.fn(() => resolved)
  chain.then = (resolve: (v: QueryResult) => void, reject: (e: unknown) => void) =>
    resolved.then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('fetchChatterReadStateForUser', () => {
  it('scopes the query to the given user and keys the map by "kind:recordId"', async () => {
    const chain = chainFor({
      data: [
        { record_kind: 'task', record_id: 42, last_seen_message_id: 100 },
        { record_kind: 'ticket', record_id: 7, last_seen_message_id: 5 },
      ],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    const map = await fetchChatterReadStateForUser('u1')

    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(map.get('task:42')).toBe(100)
    expect(map.get('ticket:7')).toBe(5)
  })

  it('returns an empty map (not an error) when the user has no read-state rows', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: null }),
    })

    expect((await fetchChatterReadStateForUser('u1')).size).toBe(0)
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(fetchChatterReadStateForUser('u1')).rejects.toThrow('boom')
  })
})

describe('upsertChatterReadState', () => {
  it('upserts keyed on (user_id, record_kind, record_id)', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertChatterReadState('u1', 'task', 42, 100)

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'u1',
        record_kind: 'task',
        record_id: 42,
        last_seen_message_id: 100,
      }),
      { onConflict: 'user_id,record_kind,record_id' }
    )
  })
})

describe('cloneChatterReadStateForUser (titular → colaborador baseline inheritance)', () => {
  it('copies every row from the source user onto the destination user, preserving kind/record/message-id', async () => {
    const selectChain = chainFor({
      data: [
        { record_kind: 'task', record_id: 1, last_seen_message_id: 10 },
        { record_kind: 'ticket', record_id: 2, last_seen_message_id: 20 },
      ],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => selectChain })

    await cloneChatterReadStateForUser('owner-1', 'worker-1')

    expect(selectChain.eq).toHaveBeenCalledWith('user_id', 'owner-1')
    expect(selectChain.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'worker-1',
          record_kind: 'task',
          record_id: 1,
          last_seen_message_id: 10,
        }),
        expect.objectContaining({
          user_id: 'worker-1',
          record_kind: 'ticket',
          record_id: 2,
          last_seen_message_id: 20,
        }),
      ],
      { onConflict: 'user_id,record_kind,record_id' }
    )
  })

  it('IMPORTANT: is a no-op (never calls upsert) when the titular has no read-state yet — must not clobber an existing worker baseline with nothing', async () => {
    const selectChain = chainFor({ data: [], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => selectChain })

    await cloneChatterReadStateForUser('owner-1', 'worker-1')

    expect(selectChain.upsert).not.toHaveBeenCalled()
  })

  it('throws on a read error and never attempts the upsert', async () => {
    const selectChain = chainFor({ data: null, error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: () => selectChain })

    await expect(cloneChatterReadStateForUser('owner-1', 'worker-1')).rejects.toThrow('boom')
    expect(selectChain.upsert).not.toHaveBeenCalled()
  })
})

describe('upsertChatterReadStateBatch', () => {
  it('is a no-op for an empty batch — never touches Supabase', async () => {
    await upsertChatterReadStateBatch('u1', [])

    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('upserts every entry in one call, all tagged with the same user', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertChatterReadStateBatch('u1', [
      { recordKind: 'task', recordId: 1, lastSeenMessageId: 5 },
      { recordKind: 'ticket', recordId: 2, lastSeenMessageId: 9 },
    ])

    expect(chain.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({ user_id: 'u1', record_kind: 'task', record_id: 1 }),
        expect.objectContaining({ user_id: 'u1', record_kind: 'ticket', record_id: 2 }),
      ],
      { onConflict: 'user_id,record_kind,record_id' }
    )
  })
})
