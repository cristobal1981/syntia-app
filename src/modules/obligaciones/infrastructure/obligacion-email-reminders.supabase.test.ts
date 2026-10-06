import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  filterAlreadyRemindedTaskIds,
  recordObligacionReminderSent,
} from '@/src/modules/obligaciones/infrastructure/obligacion-email-reminders.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

function chainFor(result: { data?: unknown; error?: { message: string } | null }) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.in = () => chain
  chain.insert = () => resolved
  chain.then = (resolve: (v: typeof result) => void, reject: (e: unknown) => void) =>
    resolved.then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('filterAlreadyRemindedTaskIds', () => {
  it('returns an empty set without querying Supabase when given no task ids', async () => {
    const result = await filterAlreadyRemindedTaskIds([])

    expect(result).toEqual(new Set())
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('returns the task ids that already have a reminder row', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [{ task_id: 3 }], error: null }),
    })

    const result = await filterAlreadyRemindedTaskIds([3, 4])

    expect(result).toEqual(new Set([3]))
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(filterAlreadyRemindedTaskIds([3])).rejects.toThrow('boom')
  })
})

describe('recordObligacionReminderSent', () => {
  it('inserts a row with the deadline as a plain date (no time component)', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => ({ insert: insertSpy }) })

    await recordObligacionReminderSent(3, 99, new Date(2026, 3, 20, 23, 59, 59))

    expect(insertSpy).toHaveBeenCalledWith({
      task_id: 3,
      partner_id: 99,
      deadline: '2026-04-20',
    })
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => ({ insert: vi.fn().mockResolvedValue({ error: { message: 'boom' } }) }),
    })

    await expect(recordObligacionReminderSent(3, 99, new Date())).rejects.toThrow('boom')
  })
})
