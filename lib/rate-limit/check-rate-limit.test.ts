import { describe, expect, it, vi, beforeEach } from 'vitest'

const { createSupabaseAdminClient, rpc } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

import { checkRateLimit } from '@/lib/rate-limit/check-rate-limit'

beforeEach(() => {
  vi.resetAllMocks()
  createSupabaseAdminClient.mockReturnValue({ rpc })
})

describe('checkRateLimit', () => {
  it('permite la acción cuando el RPC devuelve true', async () => {
    rpc.mockResolvedValue({ data: true, error: null })

    const result = await checkRateLimit('create-ticket:user-1', { limit: 5, windowSeconds: 300 })

    expect(result).toBe(true)
  })

  it('bloquea la acción cuando el RPC devuelve false', async () => {
    rpc.mockResolvedValue({ data: false, error: null })

    const result = await checkRateLimit('create-ticket:user-1', { limit: 5, windowSeconds: 300 })

    expect(result).toBe(false)
  })

  it('llama al RPC con la clave y los parámetros exactos', async () => {
    rpc.mockResolvedValue({ data: true, error: null })

    await checkRateLimit('chatter-post:user-2', { limit: 20, windowSeconds: 300 })

    expect(rpc).toHaveBeenCalledWith('check_and_increment_rate_limit', {
      p_key: 'chatter-post:user-2',
      p_limit: 20,
      p_window_seconds: 300,
    })
  })

  it('falla abierto (permite) si el RPC devuelve un error', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'relation does not exist' } })

    const result = await checkRateLimit('create-ticket:user-1', { limit: 5, windowSeconds: 300 })

    expect(result).toBe(true)
  })

  it('falla abierto (permite) si createSupabaseAdminClient lanza una excepción', async () => {
    createSupabaseAdminClient.mockImplementation(() => {
      throw new Error('Supabase service role no configurado')
    })

    const result = await checkRateLimit('create-ticket:user-1', { limit: 5, windowSeconds: 300 })

    expect(result).toBe(true)
  })

  it('falla abierto (permite) si el propio rpc() rechaza la promesa', async () => {
    rpc.mockRejectedValue(new Error('network error'))

    const result = await checkRateLimit('create-ticket:user-1', { limit: 5, windowSeconds: 300 })

    expect(result).toBe(true)
  })

  it('trata cualquier valor de data distinto de true como bloqueo (no solo false)', async () => {
    rpc.mockResolvedValue({ data: null, error: null })

    const result = await checkRateLimit('create-ticket:user-1', { limit: 5, windowSeconds: 300 })

    expect(result).toBe(false)
  })
})

describe('checkRateLimit: logging del fail-open', () => {
  it('loguea key y mensaje cuando el RPC devuelve error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    await checkRateLimit('k:1', { limit: 1, windowSeconds: 1 })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][1]).toEqual({ key: 'k:1', message: 'boom' })
    spy.mockRestore()
  })

  it('loguea key y error cuando hay excepción', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('net')
    rpc.mockRejectedValue(err)

    await checkRateLimit('k:2', { limit: 1, windowSeconds: 1 })

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0][1]).toEqual({ key: 'k:2', error: err })
    spy.mockRestore()
  })

  it('no loguea nada en el camino normal (true y false)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpc.mockResolvedValueOnce({ data: true, error: null })
    rpc.mockResolvedValueOnce({ data: false, error: null })

    await checkRateLimit('k:3', { limit: 1, windowSeconds: 1 })
    await checkRateLimit('k:3', { limit: 1, windowSeconds: 1 })

    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('data "true" (string) o 1 no cuentan como permitido', async () => {
    rpc.mockResolvedValueOnce({ data: 'true', error: null })
    rpc.mockResolvedValueOnce({ data: 1, error: null })

    expect(await checkRateLimit('k:4', { limit: 1, windowSeconds: 1 })).toBe(false)
    expect(await checkRateLimit('k:4', { limit: 1, windowSeconds: 1 })).toBe(false)
  })
})
