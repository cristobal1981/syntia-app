import { sendObligacionReminderDigestEmail } from '@/src/modules/obligaciones/application/send-obligacion-reminder-email'
import {
  getDaysUntilObligacionDeadline,
  OBLIGACION_REMINDER_DAYS_AHEAD,
  resolveObligacionReminderStage,
} from '@/src/modules/obligaciones/domain/resolve-obligacion-deadline'
import { listUpcomingObligacionReminders } from '@/src/modules/obligaciones/infrastructure/odoo-obligaciones-bulk-repository'
import {
  filterAlreadyRemindedStages,
  recordObligacionReminderSent,
} from '@/src/modules/obligaciones/infrastructure/obligacion-email-reminders.supabase'
import { listStaffEmails } from '@/src/modules/obligaciones/infrastructure/resolve-staff-emails.supabase'
import { buildOdooRecordUrl } from '@/src/modules/portal/infrastructure/odoo-json-client'

export type RunObligacionRemindersSummary = {
  candidates: number
  sent: number
  emailsSent: number
  skippedAlreadySent: number
  skippedNoEmail: number
}

/**
 * Las obligaciones las presenta la asesoría, no el cliente — el aviso va a
 * todo el equipo interno (admins + gestores, ver `resolve-staff-emails`),
 * no al cliente. Un único digest por ejecución (todas las obligaciones
 * pendientes en una tabla), no un correo por tarea.
 *
 * Dos avisos por tarea, no uno: `early` al entrar en la ventana de
 * `OBLIGACION_REMINDER_DAYS_AHEAD` y `urgent` (escalado) al entrar en la de
 * `OBLIGACION_URGENT_REMINDER_DAYS_AHEAD` — ver
 * `resolveObligacionReminderStage`. Cada tarea solo dispara el aviso que le
 * toca HOY según cuánto falta, y solo si ESE aviso concreto no se había
 * mandado ya — así una tarea descubierta ya dentro de la ventana urgente
 * recibe directamente el `urgent` (nunca un `early` retroactivo sin
 * sentido), y nunca los dos el mismo día.
 *
 * Envío secuencial (no `Promise.all`) a propósito: evita reventar el rate
 * limit de Resend. El volumen de staff de este proyecto es bajo, así que
 * esto va sobrado incluso secuencial.
 *
 * Si el envío a algún destinatario falla, no se registra NINGÚN aviso
 * como enviado (se reintentan todos la próxima ejecución) — el digest es
 * una unidad: preferimos un duplicado ocasional a perder un aviso en
 * silencio.
 */
export async function runObligacionReminders(): Promise<RunObligacionRemindersSummary> {
  const candidates = await listUpcomingObligacionReminders(OBLIGACION_REMINDER_DAYS_AHEAD)

  const summary: RunObligacionRemindersSummary = {
    candidates: candidates.length,
    sent: 0,
    emailsSent: 0,
    skippedAlreadySent: 0,
    skippedNoEmail: 0,
  }

  if (!candidates.length) return summary

  const withStage = candidates.map((candidate) => {
    const daysLeft = getDaysUntilObligacionDeadline(candidate.deadline)
    return { ...candidate, daysLeft, stage: resolveObligacionReminderStage(daysLeft) }
  })

  const alreadyReminded = await filterAlreadyRemindedStages(
    withStage.map((candidate) => ({ taskId: candidate.taskId, stage: candidate.stage }))
  )
  const pending = withStage.filter(
    (candidate) => !alreadyReminded.has(`${candidate.taskId}:${candidate.stage}`)
  )
  summary.skippedAlreadySent = withStage.length - pending.length
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
    daysLeft: candidate.daysLeft,
    taskUrl: buildOdooRecordUrl('project.task', candidate.taskId),
  }))

  for (const email of staffEmails) {
    await sendObligacionReminderDigestEmail({ to: email, items })
    summary.emailsSent += 1
  }

  for (const candidate of pending) {
    await recordObligacionReminderSent(
      candidate.taskId,
      candidate.partnerId,
      candidate.deadline,
      candidate.stage
    )
    summary.sent += 1
  }

  return summary
}
