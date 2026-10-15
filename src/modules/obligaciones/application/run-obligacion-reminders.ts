import { sendObligacionReminderDigestEmail } from '@/src/modules/obligaciones/application/send-obligacion-reminder-email'
import {
  formatObligacionNoticeDate,
  getDaysUntilObligacionDeadlineFromClock,
  getObligacionCompletion,
  getObligacionNoticeClock,
  resolveObligacionNoticeSlot,
  type ObligacionNoticeSlot,
} from '@/src/modules/obligaciones/domain/resolve-obligacion-notice'
import { listObligacionNoticeCandidates } from '@/src/modules/obligaciones/infrastructure/odoo-obligaciones-bulk-repository'
import {
  filterAlreadyRemindedNotices,
  obligacionReminderKey,
  recordObligacionReminderSent,
} from '@/src/modules/obligaciones/infrastructure/obligacion-email-reminders.supabase'
import { listStaffEmails } from '@/src/modules/obligaciones/infrastructure/resolve-staff-emails.supabase'
import { buildOdooRecordUrl } from '@/src/modules/portal/infrastructure/odoo-json-client'

export type RunObligacionRemindersSummary = {
  /** Franja que se ejecutó, o `null` si esta hora no toca avisar (entradas extra del cron por el cambio de hora). */
  slot: ObligacionNoticeSlot | null
  candidates: number
  /** Tareas que tocaban hoy pero ya están completas (hecha y con justificante). */
  skippedComplete: number
  sent: number
  emailsSent: number
  skippedAlreadySent: number
  skippedNoEmail: number
  /** Pendientes que no se registraron porque algún envío no se confirmó (p. ej. Resend sin configurar). */
  skippedNotDelivered: number
}

type RunObligacionRemindersOptions = {
  /** Momento de ejecución; se inyecta para probar y simular días. */
  now?: Date
  /** Fuerza la franja (prueba manual); sin ella se deduce de la hora local. */
  slot?: ObligacionNoticeSlot
}

/**
 * Las obligaciones las presenta la asesoría, no el cliente — el aviso va a
 * todo el equipo interno (admins + gestores, ver `resolve-staff-emails`),
 * no al cliente. Un único digest por ejecución (todas las obligaciones
 * pendientes en una tabla), no un correo por tarea.
 *
 * Calendario por franjas (ver `resolve-obligacion-notice`): el cron se
 * programa en las horas UTC de invierno y de verano y aquí solo actúa la que
 * cae a las 8:00 (días previos) o a las 14:00 (día de presentación) de
 * Canarias; la otra entrada no hace nada. Una tarea completa (hecha y con
 * justificante) nunca avisa; hecha sin justificante o con justificante sin
 * hecha avisa en ámbar, y sin ninguna de las dos, en rojo.
 *
 * Envío secuencial (no `Promise.all`) a propósito: evita reventar el rate
 * limit de Resend. El volumen de staff de este proyecto es bajo, así que
 * esto va sobrado incluso secuencial.
 *
 * Si el envío a algún destinatario falla o no se confirma (lanza, o Resend
 * sin configurar devuelve sin id), no se registra NINGÚN aviso como enviado
 * (se reintentan todos la próxima ejecución) — el digest es una unidad:
 * preferimos un duplicado ocasional a perder un aviso en silencio.
 */
export async function runObligacionReminders(
  options: RunObligacionRemindersOptions = {}
): Promise<RunObligacionRemindersSummary> {
  const clock = getObligacionNoticeClock(options.now ?? new Date())
  const slot = options.slot ?? resolveObligacionNoticeSlot(clock.hour)

  const summary: RunObligacionRemindersSummary = {
    slot,
    candidates: 0,
    skippedComplete: 0,
    sent: 0,
    emailsSent: 0,
    skippedAlreadySent: 0,
    skippedNoEmail: 0,
    skippedNotDelivered: 0,
  }

  if (!slot) return summary

  const candidates = await listObligacionNoticeCandidates({ clock, slot })
  summary.candidates = candidates.length
  if (!candidates.length) return summary

  const incomplete = candidates.flatMap((candidate) => {
    const completion = getObligacionCompletion(candidate.state, candidate.attachmentCount)
    if (completion.level === 'complete' || completion.level === 'canceled') return []
    return [{ ...candidate, completion }]
  })
  summary.skippedComplete = candidates.length - incomplete.length
  if (!incomplete.length) return summary

  const noticeDate = formatObligacionNoticeDate(clock)
  const alreadyReminded = await filterAlreadyRemindedNotices(
    incomplete.map((candidate) => ({ taskId: candidate.taskId, kind: candidate.kind })),
    noticeDate
  )
  const pending = incomplete.filter(
    (candidate) =>
      !alreadyReminded.has(obligacionReminderKey(candidate.taskId, candidate.kind, noticeDate))
  )
  summary.skippedAlreadySent = incomplete.length - pending.length
  if (!pending.length) return summary

  const staffEmails = await listStaffEmails()
  if (!staffEmails.length) {
    summary.skippedNoEmail = pending.length
    return summary
  }

  const items = pending.map((candidate) => ({
    clientName: candidate.clientName,
    modelLabel: candidate.modelLabel,
    deadline: candidate.deadline,
    daysLeft: getDaysUntilObligacionDeadlineFromClock(candidate.deadline, clock),
    kind: candidate.kind,
    completion: candidate.completion,
    taskUrl: buildOdooRecordUrl('project.task', candidate.taskId),
  }))

  for (const email of staffEmails) {
    const delivered = await sendObligacionReminderDigestEmail({ to: email, items })
    if (delivered) summary.emailsSent += 1
  }

  if (summary.emailsSent !== staffEmails.length) {
    summary.skippedNotDelivered = pending.length
    return summary
  }

  for (const candidate of pending) {
    await recordObligacionReminderSent(
      candidate.taskId,
      candidate.partnerId,
      candidate.deadline,
      candidate.kind,
      noticeDate
    )
    summary.sent += 1
  }

  return summary
}
