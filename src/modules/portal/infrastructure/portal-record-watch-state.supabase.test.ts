import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  cloneWatchStateForUser,
  fetchWatchStateForUser,
  upsertWatchStateBatch,
} from '@/src/modules/portal/infrastructure/portal-record-watch-state.supabase'

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
  resolvePortalAccountGroup.mockImplementation((actorId: string) =>
    Promise.resolve([actorId])
  )
})

describe('fetchWatchStateForUser', () => {
  it('scopes the query to the given user and keys the map by "scope:recordId"', async () => {
    const chain = chainFor({
      data: [
        {
          record_scope: 'tramite',
          record_id: 1,
          last_state: 'open',
          last_is_closed: false,
          last_attachment_count: 2,
          firma_due_soon_notified: false,
          initialized: true,
        },
      ],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    const map = await fetchWatchStateForUser('u1')

    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(map.get('tramite:1')).toEqual({
      lastState: 'open',
      lastIsClosed: false,
      lastAttachmentCount: 2,
      firmaDueSoonNotified: false,
      initialized: true,
    })
  })

  it('converts a null last_state to undefined rather than leaking the DB null', async () => {
    const chain = chainFor({
      data: [
        {
          record_scope: 'firma',
          record_id: 1,
          last_state: null,
          last_is_closed: false,
          last_attachment_count: 0,
          firma_due_soon_notified: false,
          initialized: false,
        },
      ],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    const map = await fetchWatchStateForUser('u1')

    expect(map.get('firma:1')?.lastState).toBeUndefined()
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(fetchWatchStateForUser('u1')).rejects.toThrow('boom')
  })
})

describe('cloneWatchStateForUser (titular → colaborador baseline inheritance)', () => {
  it('copies every field for every row from source to destination user', async () => {
    const selectChain = chainFor({
      data: [
        {
          record_scope: 'obligacion',
          record_id: 3,
          last_state: 'pending',
          last_is_closed: false,
          last_attachment_count: 1,
          firma_due_soon_notified: true,
          initialized: true,
        },
      ],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => selectChain })

    await cloneWatchStateForUser('owner-1', 'worker-1')

    expect(selectChain.eq).toHaveBeenCalledWith('user_id', 'owner-1')
    expect(selectChain.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'worker-1',
          record_scope: 'obligacion',
          record_id: 3,
          last_state: 'pending',
          last_is_closed: false,
          last_attachment_count: 1,
          firma_due_soon_notified: true,
          initialized: true,
        }),
      ],
      { onConflict: 'user_id,record_scope,record_id' }
    )
  })

  it('IMPORTANT: is a no-op when the titular has no watch-state yet — must not clobber an existing worker baseline', async () => {
    const selectChain = chainFor({ data: [], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => selectChain })

    await cloneWatchStateForUser('owner-1', 'worker-1')

    expect(selectChain.upsert).not.toHaveBeenCalled()
  })
})

describe('upsertWatchStateBatch', () => {
  it('is a no-op for an empty batch', async () => {
    await upsertWatchStateBatch('u1', [])

    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('defaults a missing lastState to null (not undefined) in the write payload', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertWatchStateBatch('u1', [
      {
        scope: 'tramite',
        recordId: 1,
        lastIsClosed: false,
        lastAttachmentCount: 0,
        firmaDueSoonNotified: false,
        initialized: true,
      },
    ])

    expect(chain.upsert).toHaveBeenCalledWith(
      [expect.objectContaining({ last_state: null })],
      { onConflict: 'user_id,record_scope,record_id' }
    )
  })
})

describe('upsertWatchStateBatch — grupo titular + colaboradores', () => {
  it('replica el mismo snapshot a todos los miembros del grupo devuelto por resolvePortalAccountGroup', async () => {
    resolvePortalAccountGroup.mockResolvedValue(['owner-1', 'worker-1'])
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertWatchStateBatch('worker-1', [
      {
        scope: 'tramite',
        recordId: 1,
        lastState: 'cerrado',
        lastIsClosed: true,
        lastAttachmentCount: 2,
        firmaDueSoonNotified: false,
        initialized: true,
      },
    ])

    expect(chain.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'owner-1',
          record_scope: 'tramite',
          record_id: 1,
          last_state: 'cerrado',
        }),
        expect.objectContaining({
          user_id: 'worker-1',
          record_scope: 'tramite',
          record_id: 1,
          last_state: 'cerrado',
        }),
      ],
      { onConflict: 'user_id,record_scope,record_id' }
    )
  })
})

describe('huella de responsables (last_assignee_key)', () => {
  it('la lee, y una fila anterior a la columna (null) queda como undefined', async () => {
    const chain = chainFor({
      data: [
        { record_scope: 'tramite', record_id: 1, last_state: 'a', last_is_closed: false, last_attachment_count: 0, firma_due_soon_notified: false, initialized: true, last_assignee_key: '3,9' },
        { record_scope: 'tramite', record_id: 2, last_state: 'a', last_is_closed: false, last_attachment_count: 0, firma_due_soon_notified: false, initialized: true, last_assignee_key: null },
        { record_scope: 'tramite', record_id: 3, last_state: 'a', last_is_closed: false, last_attachment_count: 0, firma_due_soon_notified: false, initialized: true, last_assignee_key: '' },
      ],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    const map = await fetchWatchStateForUser('u1')

    expect(map.get('tramite:1')?.lastAssigneeKey).toBe('3,9')
    expect(map.get('tramite:2')?.lastAssigneeKey).toBeUndefined()
    // «Nadie» (cadena vacía) es un valor propio, distinto de «aún sin huella».
    expect(map.get('tramite:3')?.lastAssigneeKey).toBe('')
  })

  it('la escribe, y sin huella escribe null (no inventa una)', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertWatchStateBatch('u1', [
      { scope: 'tramite', recordId: 1, lastIsClosed: false, lastAttachmentCount: 0, firmaDueSoonNotified: false, initialized: true, lastAssigneeKey: '3,9' },
      { scope: 'consulta', recordId: 2, lastIsClosed: false, lastAttachmentCount: 0, firmaDueSoonNotified: false, initialized: true },
    ])

    const rows = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Array<Record<string, unknown>>
    expect(rows.map((row) => row.last_assignee_key)).toEqual(['3,9', null])
  })

  it('al copiar el seguimiento del titular al colaborador copia también la huella', async () => {
    const selectChain = chainFor({
      data: [{ record_scope: 'tramite', record_id: 1, last_state: 'a', last_is_closed: false, last_attachment_count: 0, firma_due_soon_notified: false, initialized: true, last_assignee_key: '3,9' }],
      error: null,
    })
    const upsertChain = chainFor({ error: null })
    let calls = 0
    createSupabaseAdminClient.mockReturnValue({ from: () => (calls++ === 0 ? selectChain : upsertChain) })

    await cloneWatchStateForUser('owner', 'worker')

    const rows = (upsertChain.upsert as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Array<Record<string, unknown>>
    expect(rows[0]).toMatchObject({ user_id: 'worker', last_assignee_key: '3,9' })
  })
})
