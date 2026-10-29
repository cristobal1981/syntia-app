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
      summary: { users: 3, sent: 2, removed: 1, skipped: 4, rejected: 1, failed: 2, truncated: true, locked: false },
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

  it('guarda también los rechazados y los fallidos', async () => {
    const { insert } = useInsert({ error: null })
    await recordPushRun({
      source: 'events',
      startedAt,
      summary: { users: 1, sent: 0, removed: 0, skipped: 3, rejected: 2, failed: 1, truncated: false, locked: false },
    })

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ rejected: 2, failed: 1 }))
  })

  it('sin la migración aplicada, guarda la ejecución igualmente sin esos contadores', async () => {
    const insert = vi
      .fn()
      .mockResolvedValueOnce({
        error: { message: "Could not find the 'rejected' column of 'push_runs' in the schema cache" },
      })
      .mockResolvedValueOnce({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: vi.fn(() => ({ insert })) })

    await recordPushRun({
      source: 'events',
      startedAt,
      summary: { users: 1, sent: 1, removed: 0, skipped: 0, rejected: 0, failed: 0, truncated: false, locked: false },
    })

    expect(insert).toHaveBeenCalledTimes(2)
    const retried = insert.mock.calls[1]![0] as Record<string, unknown>
    expect(retried).not.toHaveProperty('rejected')
    expect(retried).not.toHaveProperty('failed')
    expect(retried).toMatchObject({ source: 'events', users: 1, sent: 1 })
    expect(console.error).not.toHaveBeenCalled()
  })

  it('un error de BD que no es de esas columnas no se reintenta y se registra', async () => {
    const { insert } = useInsert({ error: { message: 'boom' } })

    await recordPushRun({ source: 'events', startedAt })

    expect(insert).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalled()
  })

  it('una ejecución saltada por el cerrojo queda marcada', async () => {
    const { insert } = useInsert({ error: null })
    await recordPushRun({
      source: 'events',
      startedAt,
      summary: { users: 0, sent: 0, removed: 0, skipped: 0, rejected: 0, failed: 0, truncated: false, locked: true },
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
