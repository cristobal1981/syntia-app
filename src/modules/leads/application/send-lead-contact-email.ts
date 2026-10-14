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
  /** `recorded: false`: el correo salió pero no quedó en el historial de contactos. */
  | { ok: true; recorded?: false }
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

  let resendEmailId: string | null
  try {
    ;({ id: resendEmailId } = await sendEmail(
      { to, subject: builtSubject, html, text, replyTo: session.user.email },
      { required: true }
    ))
  } catch (error) {
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }

  // El correo YA salió: si el registro falla no se puede responder con error,
  // o quien envía reintenta y el lead recibe el mensaje dos veces.
  const recorded = await recordContactWithRetry({
    leadId: lead.id,
    sentBy: session.user.id,
    sentTo: to,
    subject: builtSubject,
    bodyHtml: html,
    bodyText: text,
    resendEmailId,
  })

  return recorded ? { ok: true } : { ok: true, recorded: false }
}

/** Un reintento; nunca lanza. Devuelve si el contacto quedó registrado. */
async function recordContactWithRetry(
  input: Parameters<typeof recordLeadContact>[0]
): Promise<boolean> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await recordLeadContact(input)
      return true
    } catch (error) {
      if (attempt === 2) {
        console.error('[leads] correo enviado pero no se pudo registrar el contacto', {
          leadId: input.leadId,
          resendEmailId: input.resendEmailId,
          error,
        })
      }
    }
  }
  return false
}
