import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  listUpcomingObligacionReminders,
  filterAlreadyRemindedStages,
  recordObligacionReminderSent,
  listStaffEmails,
  sendObligacionReminderDigestEmail,
  buildOdooRecordUrl,
} = vi.hoisted(() => ({
  listUpcomingObligacionReminders: vi.fn(),
  filterAlreadyRemindedStages: vi.fn(),
  recordObligacionReminderSent: vi.fn(),
  listStaffEmails: vi.fn(),
  sendObligacionReminderDigestEmail: vi.fn(),
  buildOdooRecordUrl: vi.fn(),
}))

vi.mock('@/src/modules/obligaciones/infrastructure/odoo-obligaciones-bulk-repository', () => ({
  listUpcomingObligacionReminders,
}))
vi.mock('@/src/modules/obligaciones/infrastructure/obligacion-email-reminders.supabase', () => ({
  filterAlreadyRemindedStages,
  recordObligacionReminderSent,
}))
vi.mock('@/src/modules/obligaciones/infrastructure/resolve-staff-emails.supabase', () => ({
  listStaffEmails,
}))
vi.mock('@/src/modules/obligaciones/application/send-obligacion-reminder-email', () => ({
  sendObligacionReminderDigestEmail,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  buildOdooRecordUrl,
}))

import { runObligacionReminders } from '@/src/modules/obligaciones/application/run-obligacion-reminders'

// "Hoy" fijo en todos los tests: 15 de abril. Un candidato que vence el 20
// (5 días) cae en stage `early`; uno que vence el 17 (2 días) cae en `urgent`.
const TODAY = new Date(2026, 3, 15)
const EARLY_DEADLINE = new Date(2026, 3, 20, 23, 59, 59)
const URGENT_DEADLINE = new Date(2026, 3, 17, 23, 59, 59)

const candidate = (overrides: Partial<Record<string, unknown>> = {}) => ({
  taskId: 1,
  partnerId: 99,
  clientName: 'Cliente SL',
  modelLabel: 'Modelo 303',
  deadline: EARLY_DEADLINE,
  ...overrides,
})

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(TODAY)
  vi.resetAllMocks()
  filterAlreadyRemindedStages.mockResolvedValue(new Set())
  recordObligacionReminderSent.mockResolvedValue(undefined)
  sendObligacionReminderDigestEmail.mockResolvedValue(undefined)
  buildOdooRecordUrl.mockImplementation(
    (model: string, id: number) => `https://odoo.example.com/web#id=${id}&model=${model}&view_type=form`
  )
})

afterEach(() => {
  vi.useRealTimers()
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
    expect(filterAlreadyRemindedStages).not.toHaveBeenCalled()
    expect(listStaffEmails).not.toHaveBeenCalled()
  })

  it('sends one digest email per staff recipient and records every pending candidate once, tagged with its stage', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([candidate()])
    listStaffEmails.mockResolvedValue(['admin@example.com', 'gestor@example.com'])

    const summary = await runObligacionReminders()

    expect(filterAlreadyRemindedStages).toHaveBeenCalledWith([{ taskId: 1, stage: 'early' }])
    expect(sendObligacionReminderDigestEmail).toHaveBeenCalledTimes(2)
    expect(buildOdooRecordUrl).toHaveBeenCalledWith('project.task', 1)
    expect(sendObligacionReminderDigestEmail).toHaveBeenNthCalledWith(1, {
      to: 'admin@example.com',
      items: [
        {
          clientName: 'Cliente SL',
          modelLabel: 'Modelo 303',
          deadline: EARLY_DEADLINE,
          daysLeft: 5,
          taskUrl: 'https://odoo.example.com/web#id=1&model=project.task&view_type=form',
        },
      ],
    })
    expect(sendObligacionReminderDigestEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ to: 'gestor@example.com' })
    )
    expect(recordObligacionReminderSent).toHaveBeenCalledTimes(1)
    expect(recordObligacionReminderSent).toHaveBeenCalledWith(1, 99, EARLY_DEADLINE, 'early')
    expect(summary).toEqual({
      candidates: 1,
      sent: 1,
      emailsSent: 2,
      skippedAlreadySent: 0,
      skippedNoEmail: 0,
    })
  })

  it('tags a candidate within the urgent window as stage urgent', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([candidate({ deadline: URGENT_DEADLINE })])
    listStaffEmails.mockResolvedValue(['admin@example.com'])

    await runObligacionReminders()

    expect(filterAlreadyRemindedStages).toHaveBeenCalledWith([{ taskId: 1, stage: 'urgent' }])
    expect(recordObligacionReminderSent).toHaveBeenCalledWith(1, 99, URGENT_DEADLINE, 'urgent')
  })

  it('sends the urgent reminder for a task whose early reminder was already sent', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([candidate({ deadline: URGENT_DEADLINE })])
    filterAlreadyRemindedStages.mockResolvedValue(new Set(['1:early']))
    listStaffEmails.mockResolvedValue(['admin@example.com'])

    const summary = await runObligacionReminders()

    expect(sendObligacionReminderDigestEmail).toHaveBeenCalledTimes(1)
    expect(summary.skippedAlreadySent).toBe(0)
    expect(summary.sent).toBe(1)
  })

  it('does not re-send the urgent reminder for a task that already has it recorded', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([candidate({ deadline: URGENT_DEADLINE })])
    filterAlreadyRemindedStages.mockResolvedValue(new Set(['1:urgent']))

    const summary = await runObligacionReminders()

    expect(sendObligacionReminderDigestEmail).not.toHaveBeenCalled()
    expect(listStaffEmails).not.toHaveBeenCalled()
    expect(summary.skippedAlreadySent).toBe(1)
  })

  it('bundles every pending candidate into the same digest items list', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([
      candidate({ taskId: 1, modelLabel: 'Modelo 303' }),
      candidate({ taskId: 2, modelLabel: 'Modelo 111' }),
    ])
    listStaffEmails.mockResolvedValue(['admin@example.com'])

    const summary = await runObligacionReminders()

    expect(sendObligacionReminderDigestEmail).toHaveBeenCalledTimes(1)
    const [[call]] = sendObligacionReminderDigestEmail.mock.calls
    expect(call.items).toHaveLength(2)
    expect(recordObligacionReminderSent).toHaveBeenCalledTimes(2)
    expect(summary.sent).toBe(2)
    expect(summary.emailsSent).toBe(1)
  })

  it('skips candidates that already have that stage recorded, without sending or re-recording', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([candidate({ taskId: 1 })])
    filterAlreadyRemindedStages.mockResolvedValue(new Set(['1:early']))

    const summary = await runObligacionReminders()

    expect(sendObligacionReminderDigestEmail).not.toHaveBeenCalled()
    expect(listStaffEmails).not.toHaveBeenCalled()
    expect(summary).toEqual({
      candidates: 1,
      sent: 0,
      emailsSent: 0,
      skippedAlreadySent: 1,
      skippedNoEmail: 0,
    })
  })

  it('skips without recording when there are no staff recipients to notify', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([candidate()])
    listStaffEmails.mockResolvedValue([])

    const summary = await runObligacionReminders()

    expect(sendObligacionReminderDigestEmail).not.toHaveBeenCalled()
    expect(recordObligacionReminderSent).not.toHaveBeenCalled()
    expect(summary).toEqual({
      candidates: 1,
      sent: 0,
      emailsSent: 0,
      skippedAlreadySent: 0,
      skippedNoEmail: 1,
    })
  })

  it('does not record any candidate as sent if any digest send throws (so all retry next run)', async () => {
    listUpcomingObligacionReminders.mockResolvedValue([candidate()])
    listStaffEmails.mockResolvedValue(['admin@example.com', 'gestor@example.com'])
    sendObligacionReminderDigestEmail
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('resend down'))

    await expect(runObligacionReminders()).rejects.toThrow('resend down')
    expect(recordObligacionReminderSent).not.toHaveBeenCalled()
  })
})
