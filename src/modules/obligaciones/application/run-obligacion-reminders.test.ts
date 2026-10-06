import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  listUpcomingObligacionReminders,
  filterAlreadyRemindedTaskIds,
  recordObligacionReminderSent,
  resolveClientEmailsByPartnerIds,
  sendObligacionReminderEmail,
} = vi.hoisted(() => ({
  listUpcomingObligacionReminders: vi.fn(),
  filterAlreadyRemindedTaskIds: vi.fn(),
  recordObligacionReminderSent: vi.fn(),
  resolveClientEmailsByPartnerIds: vi.fn(),
  sendObligacionReminderEmail: vi.fn(),
}))

vi.mock('@/src/modules/obligaciones/infrastructure/odoo-obligaciones-bulk-repository', () => ({
  listUpcomingObligacionReminders,
}))
vi.mock('@/src/modules/obligaciones/infrastructure/obligacion-email-reminders.supabase', () => ({
  filterAlreadyRemindedTaskIds,
  recordObligacionReminderSent,
}))
vi.mock(
  '@/src/modules/obligaciones/infrastructure/resolve-client-emails-by-partner-ids.supabase',
  () => ({ resolveClientEmailsByPartnerIds })
)
vi.mock('@/src/modules/obligaciones/application/send-obligacion-reminder-email', () => ({
  sendObligacionReminderEmail,
}))

import { runObligacionReminders } from '@/src/modules/obligaciones/application/run-obligacion-reminders'

const candidate = (overrides: Partial<Record<string, unknown>> = {}) => ({
  taskId: 1,
  partnerId: 99,
  modelLabel: 'Modelo 303',
  deadline: new Date(2026, 3, 20, 23, 59, 59),
  ...overrides,
})

beforeEach(() => {
  vi.resetAllMocks()
  filterAlreadyRemindedTaskIds.mockResolvedValue(new Set())
  recordObligacionReminderSent.mockResolvedValue(undefined)
  sendObligacionReminderEmail.mockResolvedValue(undefined)
})

describe('runObligacionReminders', () => {
  it('returns all-zero summary and skips every downstream call when there are no candidates', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([])

    const summary = await runObligacionReminders()

    expect(summary).toEqual({
      candidates: 0,
      sent: 0,
      emailsSent: 0,
      skippedAlreadySent: 0,
      skippedNoEmail: 0,
    })
    expect(filterAlreadyRemindedTaskIds).not.toHaveBeenCalled()
    expect(resolveClientEmailsByPartnerIds).not.toHaveBeenCalled()
  })

  it('sends and records a reminder for a pending candidate with a resolved email', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([candidate()])
    resolveClientEmailsByPartnerIds.mockResolvedValue(new Map([[99, ['cliente@example.com']]]))

    const summary = await runObligacionReminders()

    expect(sendObligacionReminderEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'cliente@example.com', modelLabel: 'Modelo 303' })
    )
    expect(recordObligacionReminderSent).toHaveBeenCalledWith(1, 99, candidate().deadline)
    expect(summary).toEqual({
      candidates: 1,
      sent: 1,
      emailsSent: 1,
      skippedAlreadySent: 0,
      skippedNoEmail: 0,
    })
  })

  it('sends to every eligible recipient (owner + collaborator) but records the task only once', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([candidate()])
    resolveClientEmailsByPartnerIds.mockResolvedValue(
      new Map([[99, ['cliente@example.com', 'colaborador@example.com']]])
    )

    const summary = await runObligacionReminders()

    expect(sendObligacionReminderEmail).toHaveBeenCalledTimes(2)
    expect(sendObligacionReminderEmail).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ to: 'cliente@example.com' })
    )
    expect(sendObligacionReminderEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ to: 'colaborador@example.com' })
    )
    expect(recordObligacionReminderSent).toHaveBeenCalledTimes(1)
    expect(summary).toEqual({
      candidates: 1,
      sent: 1,
      emailsSent: 2,
      skippedAlreadySent: 0,
      skippedNoEmail: 0,
    })
  })

  it('skips candidates that already have a reminder recorded, without sending or re-recording', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([candidate({ taskId: 1 })])
    filterAlreadyRemindedTaskIds.mockResolvedValue(new Set([1]))

    const summary = await runObligacionReminders()

    expect(sendObligacionReminderEmail).not.toHaveBeenCalled()
    expect(resolveClientEmailsByPartnerIds).not.toHaveBeenCalled()
    expect(summary).toEqual({
      candidates: 1,
      sent: 0,
      emailsSent: 0,
      skippedAlreadySent: 1,
      skippedNoEmail: 0,
    })
  })

  it('skips a candidate with no resolvable client email, without recording it as sent', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([candidate()])
    resolveClientEmailsByPartnerIds.mockResolvedValue(new Map())

    const summary = await runObligacionReminders()

    expect(sendObligacionReminderEmail).not.toHaveBeenCalled()
    expect(recordObligacionReminderSent).not.toHaveBeenCalled()
    expect(summary).toEqual({
      candidates: 1,
      sent: 0,
      emailsSent: 0,
      skippedAlreadySent: 0,
      skippedNoEmail: 1,
    })
  })

  it('does not record a reminder as sent if the email send throws (so it retries the next run)', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([candidate()])
    resolveClientEmailsByPartnerIds.mockResolvedValue(new Map([[99, ['cliente@example.com']]]))
    sendObligacionReminderEmail.mockRejectedValue(new Error('resend down'))

    await expect(runObligacionReminders()).rejects.toThrow('resend down')
    expect(recordObligacionReminderSent).not.toHaveBeenCalled()
  })
})
