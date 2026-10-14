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

const spies = vi.hoisted(() => ({ select: vi.fn(), in: vi.fn(), from: vi.fn() }))

function chainFor(result: { data?: unknown; error?: { message: string } | null }) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = spies.select.mockImplementation(() => chain)
  chain.in = spies.in.mockImplementation(() => chain)
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

  it('queries obligacion_email_reminders for the distinct task ids only', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: (table: string) => {
        spies.from(table)
        return chainFor({ data: [], error: null })
      },
    })

    await filterAlreadyRemindedStages([
      { taskId: 3, stage: 'early' },
      { taskId: 3, stage: 'urgent' },
      { taskId: 4, stage: 'early' },
    ])

    expect(spies.from).toHaveBeenCalledWith('obligacion_email_reminders')
    expect(spies.select).toHaveBeenCalledWith('task_id, reminder_type')
    expect(spies.in).toHaveBeenCalledWith('task_id', [3, 4])
  })

  it('returns an empty set when Supabase returns null data without error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: null }),
    })

    await expect(filterAlreadyRemindedStages([{ taskId: 3, stage: 'early' }])).resolves.toEqual(
      new Set()
    )
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
  it('inserts into obligacion_email_reminders with early stage and zero-padded local date', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null })
    const fromSpy = vi.fn(() => ({ insert: insertSpy }))
    createSupabaseAdminClient.mockReturnValue({ from: fromSpy })

    await recordObligacionReminderSent(7, 8, new Date(2026, 0, 5, 23, 59, 59), 'early')

    expect(fromSpy).toHaveBeenCalledWith('obligacion_email_reminders')
    expect(insertSpy).toHaveBeenCalledWith({
      task_id: 7,
      partner_id: 8,
      deadline: '2026-01-05',
      reminder_type: 'early',
    })
  })

  it('REGRESIÓN: la fecha es la LOCAL aunque en UTC sea el día anterior (no toISOString)', async () => {
    const originalTz = process.env.TZ
    process.env.TZ = 'Pacific/Auckland'
    try {
      const insertSpy = vi.fn().mockResolvedValue({ error: null })
      createSupabaseAdminClient.mockReturnValue({ from: () => ({ insert: insertSpy }) })

      // 5 de enero 00:30 en Auckland = 4 de enero en UTC
      await recordObligacionReminderSent(7, 8, new Date(2026, 0, 5, 0, 30), 'early')

      expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ deadline: '2026-01-05' }))
    } finally {
      if (originalTz === undefined) delete process.env.TZ
      else process.env.TZ = originalTz
    }
  })

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
