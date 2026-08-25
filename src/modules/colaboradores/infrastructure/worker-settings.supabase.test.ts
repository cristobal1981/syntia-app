import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  getWorkerSettings,
  setWorkersEnabled,
} from '@/src/modules/colaboradores/infrastructure/worker-settings.supabase'

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
  chain.maybeSingle = () => resolved
  chain.upsert = vi.fn(() => resolved)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getWorkerSettings', () => {
  it('SECURITY: defaults to workers DISABLED when the owner has no client_integrations row at all', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: null }),
    })

    const result = await getWorkerSettings('owner-1')

    expect(result.workers_enabled).toBe(false)
    expect(result.max_workers).toBe(5)
  })

  it('reflects the real row values when one exists', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () =>
        chainFor({ data: { workers_enabled: true, max_workers: 10 }, error: null }),
    })

    const result = await getWorkerSettings('owner-1')

    expect(result).toEqual({ workers_enabled: true, max_workers: 10 })
  })

  it('falls back to the default max_workers when the row exists but that column is null', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () =>
        chainFor({ data: { workers_enabled: true, max_workers: null }, error: null }),
    })

    const result = await getWorkerSettings('owner-1')

    expect(result.max_workers).toBe(5)
  })

  it('scopes the lookup to the given owner (user_id)', async () => {
    const chain = chainFor({ data: null, error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await getWorkerSettings('owner-42')

    expect(chain.eq).toHaveBeenCalledWith('user_id', 'owner-42')
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(getWorkerSettings('owner-1')).rejects.toThrow('boom')
  })
})

describe('setWorkersEnabled', () => {
  it('upserts keyed on user_id, stamping updated_at', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await setWorkersEnabled('owner-1', true)

    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'owner-1',
        workers_enabled: true,
        updated_at: expect.any(String),
      }),
      { onConflict: 'user_id' }
    )
  })

  it('throws on a DB error', async () => {
    const chain = chainFor({ error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await expect(setWorkersEnabled('owner-1', false)).rejects.toThrow('boom')
  })
})
