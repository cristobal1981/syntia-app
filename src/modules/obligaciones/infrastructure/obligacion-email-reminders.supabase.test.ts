import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  filterAlreadyRemindedStages,
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

describe('filterAlreadyRemindedStages', () => {
  it('returns an empty set without querying Supabase when given no candidates', async () => {
    const result = await filterAlreadyRemindedStages([])

    expect(result).toEqual(new Set())
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('returns composite task+stage keys for rows that already have that reminder recorded', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () =>
        chainFor({
          data: [
            { task_id: 3, reminder_type: 'early' },
            { task_id: 3, reminder_type: 'urgent' },
            { task_id: 4, reminder_type: 'early' },
          ],
          error: null,
        }),
    })

    const result = await filterAlreadyRemindedStages([
      { taskId: 3, stage: 'early' },
      { taskId: 3, stage: 'urgent' },
      { taskId: 4, stage: 'early' },
      { taskId: 5, stage: 'early' },
    ])

    expect(result).toEqual(new Set(['3:early', '3:urgent', '4:early']))
  })

  it('treats early and urgent as independent: an early-only row does not mark urgent as already sent', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [{ task_id: 3, reminder_type: 'early' }], error: null }),
    })

    const result = await filterAlreadyRemindedStages([{ taskId: 3, stage: 'urgent' }])

    expect(result.has('3:urgent')).toBe(false)
    expect(result.has('3:early')).toBe(true)
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(filterAlreadyRemindedStages([{ taskId: 3, stage: 'early' }])).rejects.toThrow(
      'boom'
    )
  })
})

describe('recordObligacionReminderSent', () => {
  it('inserts a row with the deadline as a plain date and the given reminder stage', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => ({ insert: insertSpy }) })

    await recordObligacionReminderSent(3, 99, new Date(2026, 3, 20, 23, 59, 59), 'urgent')

    expect(insertSpy).toHaveBeenCalledWith({
      task_id: 3,
      partner_id: 99,
      deadline: '2026-04-20',
      reminder_type: 'urgent',
    })
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => ({ insert: vi.fn().mockResolvedValue({ error: { message: 'boom' } }) }),
    })

    await expect(
      recordObligacionReminderSent(3, 99, new Date(), 'early')
    ).rejects.toThrow('boom')
  })
})
