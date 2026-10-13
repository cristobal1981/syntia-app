'use server'

import { buildLeadContactEmail } from '@/content/lead-contact-email'
import { getSession } from '@/src/modules/auth/application/get-session'
import { sendEmail } from '@/src/modules/email/infrastructure/send-email'
import {
  getInviteRecipientEmail,
  isInviteRecipientOverridden,
} from '@/src/modules/email/infrastructure/resend-env'
import { recordLeadContact } from '@/src/modules/leads/infrastructure/lead-contacts.supabase'
import { getLeadById } from '@/src/modules/leads/infrastructure/leads.supabase'

export type SendLeadContactEmailResult =
  | { ok: true }
  | {
      ok: false
      error: 'forbidden' | 'not_found' | 'no_email' | 'unknown'
      message?: string
    }

/**
 * A diferencia de `getLeadReport` (solo se llama desde el Page server-side,
 * ya gateado por el guard admin de la ruta), esta action la invoca
 * directamente un botón de cliente — necesita su propio chequeo de sesión.
 */
export async function sendLeadContactEmailAction(
  leadId: string,
  subject: string,
  body: string
): Promise<SendLeadContactEmailResult> {
  const session = await getSession()
  if (!session || session.user.role !== 'admin') {
    return { ok: false, error: 'forbidden' }
  }

  const trimmedSubject = subject.trim()
  const trimmedBody = body.trim()
  if (!trimmedSubject || !trimmedBody) {
    return { ok: false, error: 'unknown', message: 'Asunto y mensaje son obligatorios.' }
  }

  const lead = await getLeadById(leadId)
  if (!lead) {
    return { ok: false, error: 'not_found' }
  }
  if (!lead.email) {
    return { ok: false, error: 'no_email' }
  }

  const isOverrideRecipient = isInviteRecipientOverridden()
  const to = getInviteRecipientEmail(lead.email)
  const { subject: builtSubject, html, text } = buildLeadContactEmail({
    subject: trimmedSubject,
    body: trimmedBody,
    recipientName: lead.nombre,
    recipientEmail: lead.email,
    isOverrideRecipient,
  })

  try {
    const { id: resendEmailId } = await sendEmail(
      { to, subject: builtSubject, html, text, replyTo: session.user.email },
      { required: true }
    )

    await recordLeadContact({
      leadId: lead.id,
      sentBy: session.user.id,
      sentTo: to,
      subject: builtSubject,
      bodyHtml: html,
      bodyText: text,
      resendEmailId,
    })

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}
