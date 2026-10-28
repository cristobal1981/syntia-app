import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalUser } from '@/src/modules/auth/domain/types'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient: () => ({ rpc }),
}))

import {
  fetchPortalNewsSignalContext,
  fetchPortalSessionContext,
  resetPortalSessionContextFailures,
} from '@/src/modules/portal/infrastructure/portal-session-context.supabase'

const AUTH_ID = '3f2b8c1e-9d4a-4e7b-8a61-2c5d7e9f0a12'
const user: PortalUser = { id: AUTH_ID, email: 'Ana@Correo.es', name: 'Ana', role: 'client' }
const NOW = 1_000_000

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  resetPortalSessionContextFailures()
})

describe('fetchPortalSessionContext', () => {
  it('llama a la función con el id de Auth y el correo, y devuelve actor y cliente', async () => {
    rpc.mockResolvedValue({ data: [{ actor_id: 'actor-1', partner_id: 1233 }], error: null })

    const result = await fetchPortalSessionContext(user, NOW)

    expect(rpc).toHaveBeenCalledWith('portal_session_context', {
      p_auth_user_id: AUTH_ID,
      p_email: 'Ana@Correo.es',
    })
    expect(result).toEqual({ actorId: 'actor-1', partnerId: 1233 })
  })

  it('un bigint que llega como texto se convierte a número', async () => {
    rpc.mockResolvedValue({ data: [{ actor_id: 'a', partner_id: '9007' }], error: null })

    expect(await fetchPortalSessionContext(user, NOW)).toEqual({ actorId: 'a', partnerId: 9007 })
  })

  it.each([null, 0, -3, 'abc'])(
    'un cliente de Odoo %s es «sin cliente enlazado»',
    async (partner) => {
      rpc.mockResolvedValue({ data: [{ actor_id: 'a', partner_id: partner }], error: null })

      expect(await fetchPortalSessionContext(user, NOW)).toEqual({ actorId: 'a', partnerId: null })
    },
  )

  it('sin filas (usuario no está en el directorio) usa el camino anterior', async () => {
    rpc.mockResolvedValue({ data: [], error: null })

    expect(await fetchPortalSessionContext(user, NOW)).toBeNull()
  })

  it('un id que no es de Supabase Auth (modo demo) no llama a la función', async () => {
    const demo = { ...user, id: 'demo-client' }

    expect(await fetchPortalSessionContext(demo, NOW)).toBeNull()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('si la función no existe cae al camino anterior sin ruido y no reintenta durante 60 s', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'x' } })

    expect(await fetchPortalSessionContext(user, NOW)).toBeNull()
    expect(console.error).not.toHaveBeenCalled()

    expect(await fetchPortalSessionContext(user, NOW + 59_999)).toBeNull()
    expect(rpc).toHaveBeenCalledTimes(1)

    rpc.mockResolvedValue({ data: [{ actor_id: 'a', partner_id: 5 }], error: null })
    expect(await fetchPortalSessionContext(user, NOW + 60_000)).toEqual({
      actorId: 'a',
      partnerId: 5,
    })
  })

  it('cualquier otro error lo registra y cae al camino anterior (nunca tumba el portal)', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } })

    expect(await fetchPortalSessionContext(user, NOW)).toBeNull()
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('si la llamada revienta también cae al camino anterior', async () => {
    rpc.mockRejectedValue(new Error('red caída'))

    expect(await fetchPortalSessionContext(user, NOW)).toBeNull()
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('el fallo de una función no apaga la otra', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'x' } })
    await fetchPortalNewsSignalContext(user, NOW)

    rpc.mockResolvedValue({ data: [{ actor_id: 'a', partner_id: 5 }], error: null })
    expect(await fetchPortalSessionContext(user, NOW)).toEqual({ actorId: 'a', partnerId: 5 })
  })
})

describe('fetchPortalNewsSignalContext', () => {
  it('devuelve además el último evento', async () => {
    rpc.mockResolvedValue({
      data: [{ actor_id: 'actor-1', partner_id: 1233, seq: '230' }],
      error: null,
    })

    const result = await fetchPortalNewsSignalContext(user, NOW)

    expect(rpc).toHaveBeenCalledWith('portal_news_signal', {
      p_auth_user_id: AUTH_ID,
      p_email: 'Ana@Correo.es',
    })
    expect(result).toEqual({ actorId: 'actor-1', partnerId: 1233, seq: 230 })
  })

  it('sin evento (seq nulo) es 0', async () => {
    rpc.mockResolvedValue({ data: [{ actor_id: 'a', partner_id: 5, seq: null }], error: null })

    expect((await fetchPortalNewsSignalContext(user, NOW))?.seq).toBe(0)
  })
})
