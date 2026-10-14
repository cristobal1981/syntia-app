import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  cloneTramitesListSeenStateForUser,
  fetchTramitesListSeenState,
  upsertTramitesListSeenState,
} from '@/src/modules/tramites/infrastructure/tramites-list-seen-state.supabase'

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
 * `resolvedSelect` backs `.maybeSingle()` / `.in()` / awaiting-the-chain
 * directly (the reads). `resolvedUpsert` backs the terminal `.upsert(...)`
 * call — defaults to success so tests only override it when asserting an
 * upsert failure.
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
  chain.maybeSingle = () => resolvedSelect
  chain.upsert = vi.fn(() => resolvedUpsert)
  chain.then = (resolve: (v: QueryResult) => void, reject: (e: unknown) => void) =>
    resolvedSelect.then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
  resolvePortalAccountGroup.mockImplementation((actorId: string) =>
    Promise.resolve([actorId])
  )
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
    const chain = chainFor({ data: [], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertTramitesListSeenState('u1', ['task:1'])

    expect(chain.upsert).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          user_id: 'u1',
          open_item_keys: ['task:1'],
          initialized: true,
        }),
      ],
      { onConflict: 'user_id' }
    )
  })

  it('throws on a DB error reading the group state', async () => {
    const chain = chainFor({ data: null, error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await expect(upsertTramitesListSeenState('u1', [])).rejects.toThrow('boom')
  })
})

describe('upsertTramitesListSeenState — grupo titular + colaboradores', () => {
  it('une openItemKeys con lo que cada miembro del grupo ya tuviera, sin perder trámites que otro miembro ya había visto', async () => {
    resolvePortalAccountGroup.mockResolvedValue(['owner-1', 'worker-1'])
    const chain = chainFor({
      data: [
        { user_id: 'owner-1', open_item_keys: ['task:1', 'task:2'] },
        { user_id: 'worker-1', open_item_keys: ['task:1'] },
      ],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    // worker-1 solo confirma haber visto task:3 (nuevo); no debe borrar task:1/task:2.
    await upsertTramitesListSeenState('worker-1', ['task:3'])

    const [rows] = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Array<{ user_id: string; open_item_keys: string[] }>,
    ]
    expect(rows.find((r) => r.user_id === 'owner-1')?.open_item_keys.sort()).toEqual(
      ['task:1', 'task:2', 'task:3']
    )
    expect(rows.find((r) => r.user_id === 'worker-1')?.open_item_keys.sort()).toEqual(
      ['task:1', 'task:3']
    )
  })
})

describe('upsertTramitesListSeenState — detalles del merge', () => {
  it('consulta el estado de TODO el grupo con .in(user_id, group)', async () => {
    resolvePortalAccountGroup.mockResolvedValue(['owner-1', 'worker-1'])
    const chain = chainFor({ data: [], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertTramitesListSeenState('worker-1', ['task:1'])

    expect(resolvePortalAccountGroup).toHaveBeenCalledWith('worker-1')
    expect(chain.in).toHaveBeenCalledWith('user_id', ['owner-1', 'worker-1'])
  })

  it('escribe una fila por miembro, incluso los que no tenían estado, con initialized true y un updated_at común', async () => {
    resolvePortalAccountGroup.mockResolvedValue(['owner-1', 'worker-1', 'worker-2'])
    const chain = chainFor({
      data: [{ user_id: 'owner-1', open_item_keys: ['task:9'] }],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertTramitesListSeenState('worker-1', ['task:1'])

    const [rows] = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Array<{ user_id: string; open_item_keys: string[]; initialized: boolean; updated_at: string }>,
    ]
    expect(rows.map((r) => r.user_id)).toEqual(['owner-1', 'worker-1', 'worker-2'])
    expect(rows.every((r) => r.initialized === true)).toBe(true)
    expect(new Set(rows.map((r) => r.updated_at)).size).toBe(1)
    expect(Number.isNaN(Date.parse(rows[0].updated_at))).toBe(false)
    expect(rows[0].open_item_keys).toEqual(['task:9', 'task:1'])
    expect(rows[2].open_item_keys).toEqual(['task:1'])
  })

  it('deduplica claves repetidas entre lo existente y lo nuevo', async () => {
    resolvePortalAccountGroup.mockResolvedValue(['u1'])
    const chain = chainFor({
      data: [{ user_id: 'u1', open_item_keys: ['task:1', 'task:2'] }],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertTramitesListSeenState('u1', ['task:2', 'task:3', 'task:3'])

    const [rows] = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Array<{ open_item_keys: string[] }>,
    ]
    expect(rows[0].open_item_keys).toEqual(['task:1', 'task:2', 'task:3'])
  })

  it('DEFENSIVE: un open_item_keys malformado existente se trata como vacío', async () => {
    resolvePortalAccountGroup.mockResolvedValue(['u1'])
    const chain = chainFor({
      data: [{ user_id: 'u1', open_item_keys: 'nope' }],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertTramitesListSeenState('u1', ['task:1'])

    const [rows] = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Array<{ open_item_keys: string[] }>,
    ]
    expect(rows[0].open_item_keys).toEqual(['task:1'])
  })

  it('data null en la lectura no rompe: solo se escriben las claves nuevas', async () => {
    const chain = chainFor({ data: null, error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await upsertTramitesListSeenState('u1', ['task:1'])

    const [rows] = (chain.upsert as ReturnType<typeof vi.fn>).mock.calls[0] as [
      Array<{ open_item_keys: string[] }>,
    ]
    expect(rows[0].open_item_keys).toEqual(['task:1'])
  })

  it('lanza si falla el upsert', async () => {
    const chain = chainFor({ data: [], error: null }, { error: { message: 'upsert-boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await expect(upsertTramitesListSeenState('u1', ['x'])).rejects.toThrow('upsert-boom')
  })
})

describe('cloneTramitesListSeenStateForUser — errores y marca de tiempo', () => {
  it('lanza si falla el upsert del destino', async () => {
    const fetchChain = chainFor({
      data: { open_item_keys: ['a'], initialized: true },
      error: null,
    })
    const upsertChain = chainFor({ error: null }, { error: { message: 'clone-boom' } })
    createSupabaseAdminClient
      .mockReturnValueOnce({ from: () => fetchChain })
      .mockReturnValueOnce({ from: () => upsertChain })

    await expect(cloneTramitesListSeenStateForUser('o', 'w')).rejects.toThrow('clone-boom')
  })

  it('propaga el error de lectura del titular y no escribe', async () => {
    const fetchChain = chainFor({ data: null, error: { message: 'read-boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: () => fetchChain })

    await expect(cloneTramitesListSeenStateForUser('o', 'w')).rejects.toThrow('read-boom')
    expect(createSupabaseAdminClient).toHaveBeenCalledTimes(1)
  })

  it('incluye un updated_at ISO válido', async () => {
    const fetchChain = chainFor({
      data: { open_item_keys: [], initialized: true },
      error: null,
    })
    const upsertChain = chainFor({ error: null })
    createSupabaseAdminClient
      .mockReturnValueOnce({ from: () => fetchChain })
      .mockReturnValueOnce({ from: () => upsertChain })

    await cloneTramitesListSeenStateForUser('o', 'w')

    const [row] = (upsertChain.upsert as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { updated_at: string; open_item_keys: string[] },
    ]
    expect(Number.isNaN(Date.parse(row.updated_at))).toBe(false)
    expect(row.open_item_keys).toEqual([])
  })
})
