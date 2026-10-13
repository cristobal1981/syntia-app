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

const { resolvePortalAccountGroup } = vi.hoisted(() => ({
  resolvePortalAccountGroup: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

vi.mock('@/src/modules/colaboradores/application/get-portal-account-group', () => ({
  resolvePortalAccountGroup,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

/**
 * `resolvedSelect` backs both `.maybeSingle()`/awaiting-the-chain-directly
 * (the pre-upsert read) and, for the older single-query helpers, the only
 * query made. `resolvedUpsert` backs the terminal `.upsert(...)` call —
 * defaults to success so tests only override it when asserting an upsert
 * failure.
 */
function chainFor(
  selectResult: QueryResult,
  upsertResult: QueryResult = { error: null }
) {
  const resolvedSelect = Promise.resolve(selectResult)
  const resolvedUpsert = Promise.resolve(upsertResult)
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.eq = vi.fn(() => chain)
  chain.in = vi.fn(() => chain)
  chain.maybeSingle = vi.fn(() => resolvedSelect)
  chain.upsert = vi.fn(() => resolvedUpsert)
  chain.then = (resolve: (v: QueryResult) => void, reject: (e: unknown) => void) =>
    resolvedSelect.then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
  // Por defecto cada actorId forma su propio grupo de 1 (sin colaboradores).
  resolvePortalAccountGroup.mockImplementation((actorId: string) =>
    Promise.resolve([actorId])
  )
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
    const chain = chainFor({ data: [], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertChatterReadState('u1', 'task', 42, 100)

    expect(chain.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'u1',
          record_kind: 'task',
          record_id: 42,
          last_seen_message_id: 100,
        }),
      ],
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
    const chain = chainFor({ data: [], error: null })
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

  it('throws on a read error and never attempts the upsert', async () => {
    const chain = chainFor({ data: null, error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await expect(
      upsertChatterReadStateBatch('u1', [
        { recordKind: 'task', recordId: 1, lastSeenMessageId: 5 },
      ])
    ).rejects.toThrow('boom')
    expect(chain.upsert).not.toHaveBeenCalled()
  })
})

describe('upsertChatterReadStateBatch — grupo titular + colaboradores', () => {
  it('propaga el nuevo last_seen_message_id a todo el grupo devuelto por resolvePortalAccountGroup', async () => {
    resolvePortalAccountGroup.mockResolvedValue(['owner-1', 'worker-1'])
    const chain = chainFor({ data: [], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertChatterReadStateBatch('worker-1', [
      { recordKind: 'task', recordId: 1, lastSeenMessageId: 50 },
    ])

    expect(chain.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'owner-1',
          record_kind: 'task',
          record_id: 1,
          last_seen_message_id: 50,
        }),
        expect.objectContaining({
          user_id: 'worker-1',
          record_kind: 'task',
          record_id: 1,
          last_seen_message_id: 50,
        }),
      ],
      { onConflict: 'user_id,record_kind,record_id' }
    )
  })

  it('no retrocede la lectura de un miembro del grupo que ya había leído más lejos', async () => {
    resolvePortalAccountGroup.mockResolvedValue(['owner-1', 'worker-1'])
    const chain = chainFor({
      data: [
        { user_id: 'owner-1', record_kind: 'task', record_id: 1, last_seen_message_id: 200 },
      ],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    // worker-1 marca leído hasta el mensaje 50, pero owner-1 ya había leído hasta el 200.
    await upsertChatterReadStateBatch('worker-1', [
      { recordKind: 'task', recordId: 1, lastSeenMessageId: 50 },
    ])

    const [rows] = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Array<{ user_id: string; last_seen_message_id: number }>,
    ]
    expect(rows.find((r) => r.user_id === 'owner-1')?.last_seen_message_id).toBe(200)
    expect(rows.find((r) => r.user_id === 'worker-1')?.last_seen_message_id).toBe(50)
  })
})
