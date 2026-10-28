import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  cloneChatterReadStateForUser,
  fetchChatterReadStateForUser,
  resetChatterReadStateRpcFailure,
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
  vi.useRealTimers()
  resetChatterReadStateRpcFailure()
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

describe('upsertChatterReadStateBatch con la función SQL upsert_chatter_read_state', () => {
  const OWNER = '3f2b8c1e-9d4a-4e7b-8a61-2c5d7e9f0a12'
  const WORKER = '7a1d5c90-2b34-4c6e-9f10-8d3e4a5b6c7d'
  const entries = [
    { recordKind: 'task' as const, recordId: 10, lastSeenMessageId: 500 },
    { recordKind: 'ticket' as const, recordId: 4664, lastSeenMessageId: 239376 },
  ]

  function setup(rpcResult: QueryResult | Error = { error: null }) {
    const rpc = vi.fn(() =>
      rpcResult instanceof Error ? Promise.reject(rpcResult) : Promise.resolve(rpcResult)
    )
    const legacy = chainFor({ data: [] })
    const from = vi.fn(() => legacy)
    createSupabaseAdminClient.mockReturnValue({ rpc, from })
    return { rpc, from, legacy }
  }

  it('guarda el «visto» con una sola llamada y sin leer antes ni hacer upsert suelto', async () => {
    resolvePortalAccountGroup.mockResolvedValue([OWNER, WORKER])
    const { rpc, from } = setup()

    await upsertChatterReadStateBatch(OWNER, entries)

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('upsert_chatter_read_state', {
      p_user_ids: [OWNER, WORKER],
      p_entries: [
        { record_kind: 'task', record_id: 10, last_seen_message_id: 500 },
        { record_kind: 'ticket', record_id: 4664, last_seen_message_id: 239376 },
      ],
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('sin entradas no hace nada', async () => {
    const { rpc, from } = setup()

    await upsertChatterReadStateBatch(OWNER, [])

    expect(rpc).not.toHaveBeenCalled()
    expect(from).not.toHaveBeenCalled()
  })

  it('si algún id del grupo no es un uuid usa el camino anterior sin llamar a la función', async () => {
    resolvePortalAccountGroup.mockResolvedValue([OWNER, 'demo-worker'])
    const { rpc, from, legacy } = setup()

    await upsertChatterReadStateBatch(OWNER, entries)

    expect(rpc).not.toHaveBeenCalled()
    expect(from).toHaveBeenCalled()
    expect(legacy.upsert).toHaveBeenCalledTimes(1)
  })

  it('si la función no existe usa el camino anterior sin ruido y no reintenta durante 60 s', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-28T12:00:00Z'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    resolvePortalAccountGroup.mockResolvedValue([OWNER])
    const { rpc, legacy } = setup({ error: { code: 'PGRST202', message: 'no existe' } as never })

    await upsertChatterReadStateBatch(OWNER, entries)
    expect(legacy.upsert).toHaveBeenCalledTimes(1)
    expect(console.error).not.toHaveBeenCalled()

    vi.setSystemTime(new Date('2026-10-28T12:00:59Z'))
    await upsertChatterReadStateBatch(OWNER, entries)
    expect(rpc).toHaveBeenCalledTimes(1)

    vi.setSystemTime(new Date('2026-10-28T12:01:01Z'))
    await upsertChatterReadStateBatch(OWNER, entries)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('cualquier otro error de la función se registra y el «visto» se guarda por el camino anterior', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    resolvePortalAccountGroup.mockResolvedValue([OWNER])
    const { legacy } = setup({ error: { code: '42501', message: 'permission denied' } as never })

    await upsertChatterReadStateBatch(OWNER, entries)

    expect(console.error).toHaveBeenCalledTimes(1)
    expect(legacy.upsert).toHaveBeenCalledTimes(1)
  })

  it('si la llamada revienta el «visto» tampoco se pierde', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    resolvePortalAccountGroup.mockResolvedValue([OWNER])
    const { legacy } = setup(new Error('red caída'))

    await upsertChatterReadStateBatch(OWNER, entries)

    expect(console.error).toHaveBeenCalledTimes(1)
    expect(legacy.upsert).toHaveBeenCalledTimes(1)
  })

  it('upsertChatterReadState (un solo registro) también usa la función', async () => {
    resolvePortalAccountGroup.mockResolvedValue([OWNER])
    const { rpc } = setup()

    await upsertChatterReadState(OWNER, 'ticket', 4664, 239376)

    expect(rpc).toHaveBeenCalledWith('upsert_chatter_read_state', {
      p_user_ids: [OWNER],
      p_entries: [{ record_kind: 'ticket', record_id: 4664, last_seen_message_id: 239376 }],
    })
  })
})
