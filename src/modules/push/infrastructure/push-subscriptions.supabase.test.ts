import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

import {
  deletePushSubscription,
  fetchPushPreferences,
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
