import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

const { getMaxPortalEventSeq } = vi.hoisted(() => ({ getMaxPortalEventSeq: vi.fn() }))
vi.mock('@/src/modules/push/infrastructure/portal-events.supabase', () => ({
  getMaxPortalEventSeq,
}))

import {
  acquirePushDispatchLock,
  advancePushCursors,
  advanceUserPushCursor,
  fetchPartnerIdsByUserIds,
  deletePushSubscription,
  fetchPushPreferences,
  listPushSubscriptions,
  releasePushDispatchLock,
  savePushDispatchState,
  savePushFailureCount,
  updatePushPreferences,
  upsertPushSubscription,
} from '@/src/modules/push/infrastructure/push-subscriptions.supabase'

function chainFor(result: { data?: unknown; error?: { message: string } | null }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const resolved = { data: result.data ?? null, error: result.error ?? null }
  for (const name of ['select', 'eq', 'update', 'delete', 'upsert']) {
    chain[name] = vi.fn(() => chain)
  }
  chain.maybeSingle = vi.fn(() => Promise.resolve(resolved))
  ;(chain as { then?: unknown }).then = (resolve: (value: unknown) => unknown) =>
    Promise.resolve(resolved).then(resolve)
  return chain
}

function useClient(chain: ReturnType<typeof chainFor>) {
  const from = vi.fn(() => chain)
  createSupabaseAdminClient.mockReturnValue({ from })
  return from
}

const prefs = { chatter: true, status: false, firmas: true }
const input = {
  endpoint: 'https://push.example/abc',
  p256dh: 'key',
  auth: 'auth',
  userAgent: 'UA',
}

beforeEach(() => {
  vi.resetAllMocks()
  getMaxPortalEventSeq.mockResolvedValue(0)
})

describe('upsertPushSubscription', () => {
  it('hace upsert por endpoint, asigna el usuario y reinicia lo enviado', async () => {
    const chain = chainFor({})
    const from = useClient(chain)
    await upsertPushSubscription('user-1', input, prefs)

    expect(from).toHaveBeenCalledWith('push_subscriptions')
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        endpoint: input.endpoint,
        p256dh: 'key',
        auth: 'auth',
        user_agent: 'UA',
        notify_chatter: true,
        notify_status: false,
        notify_firmas: true,
        sent_keys: [],
      }),
      { onConflict: 'endpoint' }
    )
  })

  it('parte de la foto inicial de eventos: solo se avisa de lo que llegue después', async () => {
    getMaxPortalEventSeq.mockResolvedValue(42)
    const chain = chainFor({})
    useClient(chain)
    await upsertPushSubscription('user-1', input, prefs)

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ last_event_seq: 42 }),
      { onConflict: 'endpoint' }
    )
  })

  it('si no se puede leer el último evento no guarda la suscripción', async () => {
    getMaxPortalEventSeq.mockRejectedValue(new Error('bd'))
    const chain = chainFor({})
    useClient(chain)

    await expect(upsertPushSubscription('user-1', input, prefs)).rejects.toThrow('bd')
    expect(chain.upsert).not.toHaveBeenCalled()
  })

  it('reasignar un endpoint reinicia la foto inicial y los fallos del dueño anterior', async () => {
    const chain = chainFor({})
    useClient(chain)
    await upsertPushSubscription('user-2', input, prefs)

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ baselined_at: null, failure_count: 0 }),
      { onConflict: 'endpoint' }
    )
  })

  it('propaga el error de BD', async () => {
    useClient(chainFor({ error: { message: 'boom' } }))
    await expect(upsertPushSubscription('user-1', input, prefs)).rejects.toThrow('boom')
  })
})

describe('deletePushSubscription', () => {
  it('borra filtrando por usuario Y endpoint', async () => {
    const chain = chainFor({})
    useClient(chain)
    await deletePushSubscription('user-1', input.endpoint)
    expect(chain.delete).toHaveBeenCalled()
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.eq).toHaveBeenCalledWith('endpoint', input.endpoint)
  })

  it('propaga el error de BD', async () => {
    useClient(chainFor({ error: { message: 'boom' } }))
    await expect(deletePushSubscription('u', 'e')).rejects.toThrow('boom')
  })
})

describe('fetchPushPreferences', () => {
  it('mapea las columnas y filtra por usuario y endpoint', async () => {
    const chain = chainFor({
      data: { notify_chatter: false, notify_status: true, notify_firmas: false },
    })
    useClient(chain)
    expect(await fetchPushPreferences('user-1', input.endpoint)).toEqual({
      chatter: false,
      status: true,
      firmas: false,
    })
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.eq).toHaveBeenCalledWith('endpoint', input.endpoint)
  })

  it('null si no hay fila', async () => {
    useClient(chainFor({ data: null }))
    expect(await fetchPushPreferences('u', 'e')).toBeNull()
  })
})

describe('updatePushPreferences', () => {
  it('actualiza filtrando por usuario y endpoint; true si tocó una fila', async () => {
    const chain = chainFor({ data: [{ id: 'row' }] })
    useClient(chain)
    expect(await updatePushPreferences('user-1', input.endpoint, prefs)).toBe(true)
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        notify_chatter: true,
        notify_status: false,
        notify_firmas: true,
      })
    )
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.eq).toHaveBeenCalledWith('endpoint', input.endpoint)
  })

  it('false si no hay fila de ese usuario', async () => {
    useClient(chainFor({ data: [] }))
    expect(await updatePushPreferences('user-1', 'e', prefs)).toBe(false)
  })
})

function row(id: string, partial: Record<string, unknown> = {}) {
  return {
    id,
    user_id: 'u',
    endpoint: `https://push.example/${id}`,
    p256dh: 'k',
    auth: 'a',
    notify_chatter: true,
    notify_status: true,
    notify_firmas: true,
    sent_keys: [],
    baselined_at: null,
    failure_count: null,
    ...partial,
  }
}

function pagedClient(pages: unknown[][]) {
  const range = vi.fn()
  for (const page of pages) {
    range.mockResolvedValueOnce({ data: page, error: null })
  }
  const chain = { select: vi.fn(() => chain), order: vi.fn(() => chain), range }
  createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => chain) })
  return { chain, range }
}

describe('listPushSubscriptions', () => {
  it('pide páginas de 1000 hasta que una viene incompleta, con orden estable', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => row(`a${i}`))
    const { chain, range } = pagedClient([full, [row('b1'), row('b2')]])

    const subs = await listPushSubscriptions()

    expect(subs).toHaveLength(1002)
    expect(range).toHaveBeenNthCalledWith(1, 0, 999)
    expect(range).toHaveBeenNthCalledWith(2, 1000, 1999)
    expect(range).toHaveBeenCalledTimes(2)
    expect(chain.order).toHaveBeenCalledWith('id')
  })

  it('mapea baselined, claves enviadas y fallos', async () => {
    pagedClient([
      [
        row('s1', {
          baselined_at: '2026-10-20T10:00:00Z',
          sent_keys: ['k1', 7, 'k2'],
          failure_count: 3,
          last_event_seq: 9,
        }),
        row('s2'),
      ],
    ])

    const [first, second] = await listPushSubscriptions()

    expect(first).toMatchObject({
      lastEventSeq: 9,
      id: 's1',
      baselined: true,
      sentKeys: ['k1', 'k2'],
      failureCount: 3,
    })
    expect(second).toMatchObject({
      baselined: false,
      sentKeys: [],
      failureCount: 0,
      lastEventSeq: null,
    })
  })

  it('propaga el error de BD', async () => {
    const range = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    const chain = { select: vi.fn(() => chain), order: vi.fn(() => chain), range }
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => chain) })

    await expect(listPushSubscriptions()).rejects.toThrow('boom')
  })
})

describe('savePushDispatchState / savePushFailureCount', () => {
  it('guardar lo enviado pone a cero los fallos y marca la foto inicial', async () => {
    const chain = chainFor({})
    useClient(chain)
    await savePushDispatchState('s1', ['k'])

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        sent_keys: ['k'],
        failure_count: 0,
        baselined_at: expect.any(String),
      })
    )
    expect(chain.eq).toHaveBeenCalledWith('id', 's1')
  })

  it('guarda el recuento de fallos de la suscripción indicada', async () => {
    const chain = chainFor({})
    useClient(chain)
    await savePushFailureCount('s1', 4)

    expect(chain.update).toHaveBeenCalledWith({ failure_count: 4 })
    expect(chain.eq).toHaveBeenCalledWith('id', 's1')
  })

  it('propaga el error de BD', async () => {
    useClient(chainFor({ error: { message: 'boom' } }))
    await expect(savePushFailureCount('s1', 1)).rejects.toThrow('boom')
  })
})

describe('cerrojo del dispatcher', () => {
  function useRpc(result: unknown) {
    const rpc = vi.fn().mockResolvedValue(result)
    createSupabaseAdminClient.mockReturnValue({ rpc })
    return rpc
  }

  it('devuelve lo que diga el RPC y le pasa el TTL', async () => {
    const rpc = useRpc({ data: true, error: null })
    expect(await acquirePushDispatchLock(90)).toBe(true)
    expect(rpc).toHaveBeenCalledWith('acquire_push_dispatch_lock', { p_ttl_seconds: 90 })

    useRpc({ data: false, error: null })
    expect(await acquirePushDispatchLock(90)).toBe(false)
  })

  it('una respuesta sin valor ni error no se toma como cerrojo concedido', async () => {
    useRpc({ data: null, error: null })
    expect(await acquirePushDispatchLock(90)).toBe(false)
  })

  it('si el RPC falla no se ejecuta (fail-closed) y se loguea', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    useRpc({ data: null, error: { message: 'no existe' } })

    expect(await acquirePushDispatchLock(90)).toBe(false)
    expect(log).toHaveBeenCalled()
  })

  it('si el cliente lanza no se ejecuta', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    createSupabaseAdminClient.mockImplementation(() => {
      throw new Error('sin config')
    })

    expect(await acquirePushDispatchLock(90)).toBe(false)
  })

  it('soltar el cerrojo llama al RPC y nunca lanza', async () => {
    const rpc = useRpc({ error: null })
    await releasePushDispatchLock()
    expect(rpc).toHaveBeenCalledWith('release_push_dispatch_lock')

    vi.spyOn(console, 'error').mockImplementation(() => {})
    createSupabaseAdminClient.mockImplementation(() => {
      throw new Error('x')
    })
    await expect(releasePushDispatchLock()).resolves.toBeUndefined()
  })
})

describe('advancePushCursors', () => {
  function chainWithLt(result: { error: { message: string } | null } = { error: null }) {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    chain.update = vi.fn(() => chain)
    chain.lt = vi.fn(() => chain)
    chain.or = vi.fn(() => chain)
    chain.in = vi.fn().mockResolvedValue(result)
    return chain
  }

  it('marca los dispositivos indicados hasta ese evento', async () => {
    const chain = chainWithLt()
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => chain) })

    await advancePushCursors(['a', 'b'], 12)

    expect(chain.update).toHaveBeenCalledWith({ last_event_seq: 12 })
    expect(chain.in).toHaveBeenCalledWith('id', ['a', 'b'])
  })

  it('solo avanza: nunca baja un cursor que otro proceso ya adelantó', async () => {
    const chain = chainWithLt()
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => chain) })

    await advancePushCursors(['a'], 12)

    expect(chain.or).toHaveBeenCalledWith(expect.stringContaining('last_event_seq.lt.12'))
  })

  it('un dispositivo con el cursor vacío (sin foto inicial) también se inicializa', async () => {
    const chain = chainWithLt()
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => chain) })

    await advancePushCursors(['a'], 12)

    // `null < 12` no es verdadero en SQL: hay que pedir explícitamente los vacíos.
    expect(chain.or).toHaveBeenCalledWith('last_event_seq.is.null,last_event_seq.lt.12')
    expect(chain.lt).not.toHaveBeenCalled()
  })

  it('no llama a la BD sin dispositivos', async () => {
    await advancePushCursors([], 12)
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('parte la lista en bloques de 100', async () => {
    const chain = chainWithLt()
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => chain) })
    const ids = Array.from({ length: 250 }, (_, i) => `s${i}`)

    await advancePushCursors(ids, 1)

    expect(chain.in).toHaveBeenCalledTimes(3)
    expect((chain.in.mock.calls[0]![1] as string[]).length).toBe(100)
    expect((chain.in.mock.calls[2]![1] as string[]).length).toBe(50)
  })

  it('propaga el error de BD', async () => {
    const chain = chainWithLt({ error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => chain) })

    await expect(advancePushCursors(['a'], 1)).rejects.toThrow('boom')
  })
})

describe('advanceUserPushCursor', () => {
  function chainUser(result: { error: { message: string } | null } = { error: null }) {
    const chain: Record<string, ReturnType<typeof vi.fn>> = {}
    for (const name of ['update', 'eq', 'not']) chain[name] = vi.fn(() => chain)
    chain.lt = vi.fn().mockResolvedValue(result)
    return chain
  }

  it('adelanta solo los dispositivos de ese usuario, ya inicializados y que van por detrás', async () => {
    const chain = chainUser()
    const from = vi.fn(() => chain)
    createSupabaseAdminClient.mockReturnValue({ from })

    await advanceUserPushCursor('user-1', 30)

    expect(from).toHaveBeenCalledWith('push_subscriptions')
    expect(chain.update).toHaveBeenCalledWith({ last_event_seq: 30 })
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.not).toHaveBeenCalledWith('last_event_seq', 'is', null)
    expect(chain.lt).toHaveBeenCalledWith('last_event_seq', 30)
  })

  it('propaga el error de BD', async () => {
    const chain = chainUser({ error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => chain) })

    await expect(advanceUserPushCursor('user-1', 30)).rejects.toThrow('boom')
  })
})

describe('fetchPartnerIdsByUserIds', () => {
  it('mapea usuario a cliente de Odoo y descarta filas sin vínculo', async () => {
    const chain = {
      select: vi.fn(() => chain),
      in: vi.fn().mockResolvedValue({
        data: [
          { user_id: 'u1', odoo_partner_id: 5 },
          { user_id: 'u2', odoo_partner_id: null },
          { user_id: 'u3', odoo_partner_id: 0 },
        ],
        error: null,
      }),
    }
    const from = vi.fn(() => chain)
    createSupabaseAdminClient.mockReturnValue({ from })

    const result = await fetchPartnerIdsByUserIds(['u1', 'u2', 'u3'])

    expect(from).toHaveBeenCalledWith('client_integrations')
    expect(chain.in).toHaveBeenCalledWith('user_id', ['u1', 'u2', 'u3'])
    expect([...result]).toEqual([['u1', 5]])
  })

  it('sin usuarios no consulta', async () => {
    expect((await fetchPartnerIdsByUserIds([])).size).toBe(0)
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('propaga el error de BD', async () => {
    const chain = {
      select: vi.fn(() => chain),
      in: vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } }),
    }
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => chain) })

    await expect(fetchPartnerIdsByUserIds(['u1'])).rejects.toThrow('boom')
  })
})
