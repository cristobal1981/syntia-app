import { sendObligacionReminderEmail } from '@/src/modules/obligaciones/application/send-obligacion-reminder-email'
import {
  getDaysUntilObligacionDeadline,
  OBLIGACION_REMINDER_DAYS_AHEAD,
} from '@/src/modules/obligaciones/domain/resolve-obligacion-deadline'
import { listUpcomingObligacionReminders } from '@/src/modules/obligaciones/infrastructure/odoo-obligaciones-bulk-repository'
import {
  filterAlreadyRemindedTaskIds,
  recordObligacionReminderSent,
} from '@/src/modules/obligaciones/infrastructure/obligacion-email-reminders.supabase'
import { resolveClientEmailsByPartnerIds } from '@/src/modules/obligaciones/infrastructure/resolve-client-emails-by-partner-ids.supabase'

export type RunObligacionRemindersSummary = {
  candidates: number
  sent: number
  emailsSent: number
  skippedAlreadySent: number
  skippedNoEmail: number
}

/**
 * Envío secuencial (no `Promise.all`) a propósito: evita reventar el rate
 * limit de Resend. El volumen de clientes de este proyecto es bajo, así que
 * esto va sobrado incluso secuencial.
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

  const alreadyReminded = await filterAlreadyRemindedTaskIds(
    candidates.map((candidate) => candidate.taskId)
  )
  const pending = candidates.filter((candidate) => !alreadyReminded.has(candidate.taskId))
  summary.skippedAlreadySent = candidates.length - pending.length
  if (!pending.length) return summary

  const partnerIds = [...new Set(pending.map((candidate) => candidate.partnerId))]
  const emailByPartnerId = await resolveClientEmailsByPartnerIds(partnerIds)

  for (const candidate of pending) {
    const emails = emailByPartnerId.get(candidate.partnerId)
    if (!emails?.length) {
      summary.skippedNoEmail += 1
      continue
    }

    for (const email of emails) {
      await sendObligacionReminderEmail({
        to: email,
        modelLabel: candidate.modelLabel,
        deadline: candidate.deadline,
        daysLeft: getDaysUntilObligacionDeadline(candidate.deadline),
      })
      summary.emailsSent += 1
    }

    await recordObligacionReminderSent(candidate.taskId, candidate.partnerId, candidate.deadline)
    summary.sent += 1
  }

  return summary
}
