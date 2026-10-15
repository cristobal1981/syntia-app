import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  listObligacionNoticeCandidates,
  filterAlreadyRemindedNotices,
  recordObligacionReminderSent,
  listStaffEmails,
  sendObligacionReminderDigestEmail,
  buildOdooRecordUrl,
} = vi.hoisted(() => ({
  listObligacionNoticeCandidates: vi.fn(),
  filterAlreadyRemindedNotices: vi.fn(),
  recordObligacionReminderSent: vi.fn(),
  listStaffEmails: vi.fn(),
  sendObligacionReminderDigestEmail: vi.fn(),
  buildOdooRecordUrl: vi.fn(),
}))

vi.mock('@/src/modules/obligaciones/infrastructure/odoo-obligaciones-bulk-repository', () => ({
  listObligacionNoticeCandidates,
}))
vi.mock('@/src/modules/obligaciones/infrastructure/obligacion-email-reminders.supabase', () => ({
  filterAlreadyRemindedNotices,
  recordObligacionReminderSent,
  obligacionReminderKey: (taskId: number, kind: string, noticeDate: string) =>
    `${taskId}:${kind}:${noticeDate}`,
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

// 14 de octubre de 2026 a las 8:00 de Canarias (horario de verano, UTC+1).
const MORNING = new Date('2026-10-14T07:00:00Z')
// El mismo día a las 14:00 de Canarias.
const AFTERNOON = new Date('2026-10-14T13:00:00Z')
const NOTICE_DATE = '2026-10-14'
const DEADLINE = new Date(2026, 9, 20, 23, 59, 59)

const candidate = (overrides: Partial<Record<string, unknown>> = {}) => ({
  taskId: 1,
  partnerId: 99,
  clientName: 'Cliente SL',
  modelLabel: 'Modelo 303',
  deadline: DEADLINE,
  state: '01_in_progress',
  attachmentCount: 0,
  kind: 'domiciliar',
  ...overrides,
})

const emptySummary = {
  slot: 'morning',
  candidates: 0,
  skippedComplete: 0,
  sent: 0,
  emailsSent: 0,
  skippedAlreadySent: 0,
  skippedNoEmail: 0,
  skippedNotDelivered: 0,
}

beforeEach(() => {
  vi.resetAllMocks()
  filterAlreadyRemindedNotices.mockResolvedValue(new Set())
  recordObligacionReminderSent.mockResolvedValue(undefined)
  sendObligacionReminderDigestEmail.mockResolvedValue(true)
  listStaffEmails.mockResolvedValue(['admin@example.com'])
  buildOdooRecordUrl.mockImplementation(
    (model: string, id: number) => `https://odoo.example.com/web#id=${id}&model=${model}&view_type=form`
  )
})

describe('franja', () => {
  it('a las 8:00 de Canarias en verano ejecuta la franja de la mañana con el reloj local', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([])

    const summary = await runObligacionReminders({ now: MORNING })

    expect(listObligacionNoticeCandidates).toHaveBeenCalledWith({
      clock: { year: 2026, month: 10, day: 14, hour: 8 },
      slot: 'morning',
    })
    expect(summary.slot).toBe('morning')
  })

  it('a las 8:00 de Canarias en invierno (UTC+0) también es la mañana', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([])

    await runObligacionReminders({ now: new Date('2026-01-15T08:00:00Z') })

    expect(listObligacionNoticeCandidates).toHaveBeenCalledWith({
      clock: { year: 2026, month: 1, day: 15, hour: 8 },
      slot: 'morning',
    })
  })

  it('a las 14:00 locales ejecuta la franja del día de presentación', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([])

    const summary = await runObligacionReminders({ now: AFTERNOON })

    expect(listObligacionNoticeCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ slot: 'presentation' })
    )
    expect(summary.slot).toBe('presentation')
  })

  it('la entrada del cron que cae a otra hora local no hace nada: ni Odoo, ni Supabase, ni correo', async () => {
    // 7:00 UTC en invierno son las 7:00 locales: la entrada de verano sobra.
    const summary = await runObligacionReminders({ now: new Date('2026-01-15T07:00:00Z') })

    expect(summary).toEqual({ ...emptySummary, slot: null })
    expect(listObligacionNoticeCandidates).not.toHaveBeenCalled()
    expect(filterAlreadyRemindedNotices).not.toHaveBeenCalled()
    expect(sendObligacionReminderDigestEmail).not.toHaveBeenCalled()
  })

  it('una franja forzada manda sobre la hora local', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([])

    await runObligacionReminders({ now: new Date('2026-01-15T03:00:00Z'), slot: 'presentation' })

    expect(listObligacionNoticeCandidates).toHaveBeenCalledWith(
      expect.objectContaining({ slot: 'presentation' })
    )
  })
})

describe('estado de la tarea', () => {
  it('no avisa de una tarea completa (hecha y con justificante), sea cual sea el día', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([
      candidate({ state: 'done', attachmentCount: 1 }),
    ])

    const summary = await runObligacionReminders({ now: MORNING })

    expect(sendObligacionReminderDigestEmail).not.toHaveBeenCalled()
    expect(filterAlreadyRemindedNotices).not.toHaveBeenCalled()
    expect(summary).toEqual({ ...emptySummary, candidates: 1, skippedComplete: 1 })
  })

  it('avisa en rojo de una tarea sin hacer y sin justificante', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([candidate()])

    await runObligacionReminders({ now: MORNING })

    const [[call]] = sendObligacionReminderDigestEmail.mock.calls
    expect(call.items[0].completion).toEqual({ level: 'missing' })
  })

  it('avisa en ámbar de una hecha sin justificante', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([
      candidate({ state: 'done', attachmentCount: 0 }),
    ])

    await runObligacionReminders({ now: MORNING })

    const [[call]] = sendObligacionReminderDigestEmail.mock.calls
    expect(call.items[0].completion).toEqual({
      level: 'partial',
      reason: 'done_without_document',
    })
  })

  it('avisa en ámbar de una con justificante sin marcar como hecha', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([candidate({ attachmentCount: 2 })])

    await runObligacionReminders({ now: MORNING })

    const [[call]] = sendObligacionReminderDigestEmail.mock.calls
    expect(call.items[0].completion).toEqual({
      level: 'partial',
      reason: 'document_without_done',
    })
  })

  it('no avisa de una cancelada', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([candidate({ state: 'canceled' })])

    const summary = await runObligacionReminders({ now: MORNING })

    expect(sendObligacionReminderDigestEmail).not.toHaveBeenCalled()
    expect(summary.skippedComplete).toBe(1)
  })

  it('una cancelada no cuenta como completa en el resumen del correo', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([
      candidate({ taskId: 1 }),
      candidate({ taskId: 2, state: 'canceled' }),
      candidate({ taskId: 3, state: 'done', attachmentCount: 1 }),
    ])

    await runObligacionReminders({ now: MORNING })

    const [[call]] = sendObligacionReminderDigestEmail.mock.calls
    expect(call.completeCount).toBe(1)
  })

  it('mezcla en un solo digest las incompletas y deja fuera las completas', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([
      candidate({ taskId: 1, modelLabel: 'Modelo 303' }),
      candidate({ taskId: 2, modelLabel: 'Modelo 111', state: 'done', attachmentCount: 1 }),
    ])

    const summary = await runObligacionReminders({ now: MORNING })

    const [[call]] = sendObligacionReminderDigestEmail.mock.calls
    expect(call.items.map((item: { modelLabel: string }) => item.modelLabel)).toEqual([
      'Modelo 303',
    ])
    expect(call.completeCount).toBe(1)
    expect(summary.skippedComplete).toBe(1)
    expect(summary.sent).toBe(1)
  })
})

describe('deduplicación por día', () => {
  it('consulta lo ya enviado para el día local de hoy y registra con ese día', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([candidate()])

    await runObligacionReminders({ now: MORNING })

    expect(filterAlreadyRemindedNotices).toHaveBeenCalledWith(
      [{ taskId: 1, kind: 'domiciliar' }],
      NOTICE_DATE
    )
    expect(recordObligacionReminderSent).toHaveBeenCalledWith(
      1,
      99,
      DEADLINE,
      'domiciliar',
      NOTICE_DATE
    )
  })

  it('no reenvía lo ya enviado hoy, pero sí el resto', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([
      candidate({ taskId: 1 }),
      candidate({ taskId: 2, modelLabel: 'Modelo 111', partnerId: 77 }),
    ])
    filterAlreadyRemindedNotices.mockResolvedValue(new Set([`1:domiciliar:${NOTICE_DATE}`]))

    const summary = await runObligacionReminders({ now: MORNING })

    const [[call]] = sendObligacionReminderDigestEmail.mock.calls
    expect(call.items).toHaveLength(1)
    expect(call.items[0].modelLabel).toBe('Modelo 111')
    expect(recordObligacionReminderSent).toHaveBeenCalledTimes(1)
    expect(recordObligacionReminderSent).toHaveBeenCalledWith(
      2,
      77,
      DEADLINE,
      'domiciliar',
      NOTICE_DATE
    )
    expect(summary.skippedAlreadySent).toBe(1)
  })

  it('un aviso enviado otro día no suprime el de hoy', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([candidate()])
    filterAlreadyRemindedNotices.mockResolvedValue(new Set(['1:domiciliar:2026-10-10']))

    const summary = await runObligacionReminders({ now: MORNING })

    expect(summary.skippedAlreadySent).toBe(0)
    expect(summary.sent).toBe(1)
  })

  it('si todo estaba ya enviado no busca destinatarios ni manda nada', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([candidate()])
    filterAlreadyRemindedNotices.mockResolvedValue(new Set([`1:domiciliar:${NOTICE_DATE}`]))

    const summary = await runObligacionReminders({ now: MORNING })

    expect(sendObligacionReminderDigestEmail).not.toHaveBeenCalled()
    expect(listStaffEmails).not.toHaveBeenCalled()
    expect(summary).toEqual({ ...emptySummary, candidates: 1, skippedAlreadySent: 1 })
  })
})

describe('envío', () => {
  it('manda un digest por destinatario del staff con el aviso, el estado y el enlace a la tarea', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([candidate()])
    listStaffEmails.mockResolvedValue(['admin@example.com', 'gestor@example.com'])

    const summary = await runObligacionReminders({ now: MORNING })

    expect(sendObligacionReminderDigestEmail).toHaveBeenCalledTimes(2)
    expect(buildOdooRecordUrl).toHaveBeenCalledWith('project.task', 1)
    expect(sendObligacionReminderDigestEmail).toHaveBeenNthCalledWith(1, {
      to: 'admin@example.com',
      completeCount: 0,
      items: [
        {
          clientName: 'Cliente SL',
          modelLabel: 'Modelo 303',
          deadline: DEADLINE,
          daysLeft: 6,
          kind: 'domiciliar',
          completion: { level: 'missing' },
          taskUrl: 'https://odoo.example.com/web#id=1&model=project.task&view_type=form',
        },
      ],
    })
    expect(sendObligacionReminderDigestEmail).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ to: 'gestor@example.com' })
    )
    expect(summary).toEqual({
      ...emptySummary,
      candidates: 1,
      sent: 1,
      emailsSent: 2,
    })
  })

  it('registra solo después de enviar a todos', async () => {
    const order: string[] = []
    listObligacionNoticeCandidates.mockResolvedValue([candidate()])
    listStaffEmails.mockResolvedValue(['a@example.com', 'b@example.com'])
    sendObligacionReminderDigestEmail.mockImplementation(async () => {
      order.push('send')
      return true
    })
    recordObligacionReminderSent.mockImplementation(async () => {
      order.push('record')
    })

    await runObligacionReminders({ now: MORNING })

    expect(order).toEqual(['send', 'send', 'record'])
  })

  it('sin destinatarios no registra nada', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([candidate()])
    listStaffEmails.mockResolvedValue([])

    const summary = await runObligacionReminders({ now: MORNING })

    expect(sendObligacionReminderDigestEmail).not.toHaveBeenCalled()
    expect(recordObligacionReminderSent).not.toHaveBeenCalled()
    expect(summary).toEqual({ ...emptySummary, candidates: 1, skippedNoEmail: 1 })
  })

  it('si un envío no se confirma sigue con el resto pero no registra ningún aviso', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([candidate()])
    listStaffEmails.mockResolvedValue(['a@example.com', 'b@example.com', 'c@example.com'])
    sendObligacionReminderDigestEmail
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)

    const summary = await runObligacionReminders({ now: MORNING })

    expect(sendObligacionReminderDigestEmail).toHaveBeenCalledTimes(3)
    expect(summary.emailsSent).toBe(2)
    expect(summary.skippedNotDelivered).toBe(1)
    expect(recordObligacionReminderSent).not.toHaveBeenCalled()
  })

  it('si el envío lanza, no registra nada y propaga el error', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([candidate()])
    sendObligacionReminderDigestEmail.mockRejectedValue(new Error('boom'))

    await expect(runObligacionReminders({ now: MORNING })).rejects.toThrow('boom')
    expect(recordObligacionReminderSent).not.toHaveBeenCalled()
  })

  it('propaga un fallo al registrar', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([candidate()])
    recordObligacionReminderSent.mockRejectedValue(new Error('db down'))

    await expect(runObligacionReminders({ now: MORNING })).rejects.toThrow('db down')
  })

  it('propaga un fallo al leer lo ya enviado y no manda nada', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([candidate()])
    filterAlreadyRemindedNotices.mockRejectedValue(new Error('read fail'))

    await expect(runObligacionReminders({ now: MORNING })).rejects.toThrow('read fail')
    expect(sendObligacionReminderDigestEmail).not.toHaveBeenCalled()
  })

  it('sin candidatos devuelve el resumen vacío y no toca nada más', async () => {
    listObligacionNoticeCandidates.mockResolvedValue([])

    const summary = await runObligacionReminders({ now: MORNING })

    expect(summary).toEqual(emptySummary)
    expect(filterAlreadyRemindedNotices).not.toHaveBeenCalled()
    expect(listStaffEmails).not.toHaveBeenCalled()
  })
})
