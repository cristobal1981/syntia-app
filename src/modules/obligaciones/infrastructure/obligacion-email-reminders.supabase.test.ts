import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  filterAlreadyRemindedNotices,
  obligacionReminderKey,
  recordObligacionReminderSent,
} from '@/src/modules/obligaciones/infrastructure/obligacion-email-reminders.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

const spies = vi.hoisted(() => ({
  select: vi.fn(),
  in: vi.fn(),
  eq: vi.fn(),
  from: vi.fn(),
}))

function chainFor(result: { data?: unknown; error?: { message: string } | null }) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = spies.select.mockImplementation(() => chain)
  chain.in = spies.in.mockImplementation(() => chain)
  chain.eq = spies.eq.mockImplementation(() => chain)
  chain.insert = () => resolved
  chain.then = (resolve: (v: typeof result) => void, reject: (e: unknown) => void) =>
    resolved.then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
})

const DAY = '2026-10-14'

describe('filterAlreadyRemindedNotices', () => {
  it('returns an empty set without querying Supabase when given no candidates', async () => {
    const result = await filterAlreadyRemindedNotices([], DAY)

    expect(result).toEqual(new Set())
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('returns composite task+kind+day keys for rows already recorded that day', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () =>
        chainFor({
          data: [
            { task_id: 3, reminder_type: 'domiciliar' },
            { task_id: 4, reminder_type: 'normal' },
          ],
          error: null,
        }),
    })

    const result = await filterAlreadyRemindedNotices(
      [
        { taskId: 3, kind: 'domiciliar' },
        { taskId: 4, kind: 'normal' },
        { taskId: 5, kind: 'normal' },
      ],
      DAY
    )

    expect(result).toEqual(new Set([`3:domiciliar:${DAY}`, `4:normal:${DAY}`]))
    expect(result.has(obligacionReminderKey(5, 'normal', DAY))).toBe(false)
  })

  it('treats kinds as independent: a domiciliar row does not mark presentacion as sent', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: [{ task_id: 3, reminder_type: 'domiciliar' }], error: null }),
    })

    const result = await filterAlreadyRemindedNotices([{ taskId: 3, kind: 'presentacion' }], DAY)

    expect(result.has(obligacionReminderKey(3, 'presentacion', DAY))).toBe(false)
    expect(result.has(obligacionReminderKey(3, 'domiciliar', DAY))).toBe(true)
  })

  it('queries only the given notice day and the distinct task ids', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: (table: string) => {
        spies.from(table)
        return chainFor({ data: [], error: null })
      },
    })

    await filterAlreadyRemindedNotices(
      [
        { taskId: 3, kind: 'domiciliar' },
        { taskId: 3, kind: 'normal' },
        { taskId: 4, kind: 'normal' },
      ],
      DAY
    )

    expect(spies.from).toHaveBeenCalledWith('obligacion_email_reminders')
    expect(spies.select).toHaveBeenCalledWith('task_id, reminder_type')
    expect(spies.in).toHaveBeenCalledWith('task_id', [3, 4])
    expect(spies.eq).toHaveBeenCalledWith('notice_date', DAY)
  })

  it('returns an empty set when Supabase returns null data without error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: null }),
    })

    await expect(
      filterAlreadyRemindedNotices([{ taskId: 3, kind: 'normal' }], DAY)
    ).resolves.toEqual(new Set())
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(
      filterAlreadyRemindedNotices([{ taskId: 3, kind: 'normal' }], DAY)
    ).rejects.toThrow('boom')
  })
})

describe('recordObligacionReminderSent', () => {
  it('inserts into obligacion_email_reminders with the kind, the notice day and a zero-padded local deadline', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null })
    const fromSpy = vi.fn(() => ({ insert: insertSpy }))
    createSupabaseAdminClient.mockReturnValue({ from: fromSpy })

    await recordObligacionReminderSent(7, 8, new Date(2026, 0, 5, 23, 59, 59), 'normal', '2026-01-01')

    expect(fromSpy).toHaveBeenCalledWith('obligacion_email_reminders')
    expect(insertSpy).toHaveBeenCalledWith({
      task_id: 7,
      partner_id: 8,
      deadline: '2026-01-05',
      reminder_type: 'normal',
      notice_date: '2026-01-01',
    })
  })

  it('REGRESIÓN: la fecha es la LOCAL aunque en UTC sea el día anterior (no toISOString)', async () => {
    const originalTz = process.env.TZ
    process.env.TZ = 'Pacific/Auckland'
    try {
      const insertSpy = vi.fn().mockResolvedValue({ error: null })
      createSupabaseAdminClient.mockReturnValue({ from: () => ({ insert: insertSpy }) })

      // 5 de enero 00:30 en Auckland = 4 de enero en UTC
      await recordObligacionReminderSent(7, 8, new Date(2026, 0, 5, 0, 30), 'normal', '2026-01-01')

      expect(insertSpy).toHaveBeenCalledWith(expect.objectContaining({ deadline: '2026-01-05' }))
    } finally {
      if (originalTz === undefined) delete process.env.TZ
      else process.env.TZ = originalTz
    }
  })

  it('inserts a row with the deadline as a plain date and the given notice kind', async () => {
    const insertSpy = vi.fn().mockResolvedValue({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => ({ insert: insertSpy }) })

    await recordObligacionReminderSent(3, 99, new Date(2026, 3, 20, 23, 59, 59), 'presentacion', '2026-04-20')

    expect(insertSpy).toHaveBeenCalledWith({
      task_id: 3,
      partner_id: 99,
      deadline: '2026-04-20',
      reminder_type: 'presentacion',
      notice_date: '2026-04-20',
    })
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => ({ insert: vi.fn().mockResolvedValue({ error: { message: 'boom' } }) }),
    })

    await expect(
      recordObligacionReminderSent(3, 99, new Date(), 'normal', '2026-01-01')
    ).rejects.toThrow('boom')
  })
})
