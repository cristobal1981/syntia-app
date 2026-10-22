import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

import {
  acquirePushDispatchLock,
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
        }),
        row('s2'),
      ],
    ])

    const [first, second] = await listPushSubscriptions()

    expect(first).toMatchObject({
      id: 's1',
      baselined: true,
      sentKeys: ['k1', 'k2'],
      failureCount: 3,
    })
    expect(second).toMatchObject({ baselined: false, sentKeys: [], failureCount: 0 })
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

  it('si el RPC falla se ejecuta sin cerrojo (fail-open) y se loguea', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    useRpc({ data: null, error: { message: 'no existe' } })

    expect(await acquirePushDispatchLock(90)).toBe(true)
    expect(log).toHaveBeenCalled()
  })

  it('si el cliente lanza se ejecuta sin cerrojo', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    createSupabaseAdminClient.mockImplementation(() => {
      throw new Error('sin config')
    })

    expect(await acquirePushDispatchLock(90)).toBe(true)
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
