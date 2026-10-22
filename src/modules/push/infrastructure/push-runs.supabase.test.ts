import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseAdminClient } = vi.hoisted(() => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

import { recordPushRun } from '@/src/modules/push/infrastructure/push-runs.supabase'

const startedAt = new Date('2026-10-22T10:00:00Z')

function useInsert(result: { error: { message: string } | null }) {
  const insert = vi.fn().mockResolvedValue(result)
  const from = vi.fn(() => ({ insert }))
  createSupabaseAdminClient.mockReturnValue({ from })
  return { insert, from }
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('recordPushRun', () => {
  it('guarda el resumen en push_runs', async () => {
    const { insert, from } = useInsert({ error: null })
    await recordPushRun({
      source: 'events',
      startedAt,
      summary: { users: 3, sent: 2, removed: 1, skipped: 4, truncated: true, locked: false },
    })

    expect(from).toHaveBeenCalledWith('push_runs')
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'events',
        started_at: '2026-10-22T10:00:00.000Z',
        finished_at: expect.any(String),
        users: 3,
        sent: 2,
        removed: 1,
        skipped: 4,
        truncated: true,
        locked: false,
        error: null,
      })
    )
  })

  it('una ejecución fallida guarda el error (acotado) y contadores a cero', async () => {
    const { insert } = useInsert({ error: null })
    await recordPushRun({ source: 'snapshots', startedAt, error: 'x'.repeat(900) })

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'snapshots',
        users: 0,
        sent: 0,
        truncated: false,
        error: 'x'.repeat(500),
      })
    )
  })

  it('una ejecución saltada por el cerrojo queda marcada', async () => {
    const { insert } = useInsert({ error: null })
    await recordPushRun({
      source: 'events',
      startedAt,
      summary: { users: 0, sent: 0, removed: 0, skipped: 0, truncated: false, locked: true },
    })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ locked: true }))
  })

  it('nunca lanza: ni con error de BD ni con el cliente roto', async () => {
    useInsert({ error: { message: 'boom' } })
    await expect(recordPushRun({ source: 'events', startedAt })).resolves.toBeUndefined()

    createSupabaseAdminClient.mockImplementation(() => {
      throw new Error('sin config')
    })
    await expect(recordPushRun({ source: 'events', startedAt })).resolves.toBeUndefined()
  })
})
