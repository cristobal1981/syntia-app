import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseAdminClient } = vi.hoisted(() => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

import { getSweepCursor, setSweepCursor } from '@/src/modules/push/infrastructure/sweep-state.supabase'

beforeEach(() => vi.resetAllMocks())

describe('getSweepCursor', () => {
  function use(result: { data?: unknown; error?: { message: string } | null }) {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      maybeSingle: vi.fn().mockResolvedValue({ data: result.data ?? null, error: result.error ?? null }),
    }
    const from = vi.fn(() => chain)
    createSupabaseAdminClient.mockReturnValue({ from })
    return { chain, from }
  }

  it('lee la fila única de portal_sweep_state', async () => {
    const { chain, from } = use({ data: { last_message_id: 123 } })

    expect(await getSweepCursor()).toBe(123)
    expect(from).toHaveBeenCalledWith('portal_sweep_state')
    expect(chain.eq).toHaveBeenCalledWith('id', 1)
  })

  it('null si no hay fila o no tiene cursor', async () => {
    use({ data: null })
    expect(await getSweepCursor()).toBeNull()

    use({ data: { last_message_id: null } })
    expect(await getSweepCursor()).toBeNull()
  })

  it('propaga el error de BD', async () => {
    use({ error: { message: 'boom' } })
    await expect(getSweepCursor()).rejects.toThrow('boom')
  })
})

describe('setSweepCursor', () => {
  it('guarda el cursor en la fila única', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => ({ upsert })) })

    await setSweepCursor(456)

    expect(upsert).toHaveBeenCalledWith({
      id: 1,
      last_message_id: 456,
      updated_at: expect.any(String),
    })
  })

  it('propaga el error de BD', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => ({ upsert })) })

    await expect(setSweepCursor(1)).rejects.toThrow('boom')
  })
})
