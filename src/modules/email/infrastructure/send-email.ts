import { Resend } from 'resend'

import type { SendEmailInput } from '@/src/modules/email/domain/types'
import {
  getResendFromEmail,
  isResendConfigured,
} from '@/src/modules/email/infrastructure/resend-env'

type SendEmailOptions = {
  /** Si true, lanza si falta config de Resend. */
  required?: boolean
}

/**
 * Frases exactas con las que Resend rechaza un envío desde el dominio de
 * pruebas: «You can only send testing emails to your own email address» y
 * «...please verify a domain at resend.com/domains». Subcadenas más cortas
 * («testing», «only send») darían una pista falsa con errores no relacionados.
 */
const RESEND_SANDBOX_PHRASES = [
  'only send testing emails to your own email address',
  'verify a domain',
]

function isResendSandboxError(message: string): boolean {
  const lower = message.toLowerCase()
  return RESEND_SANDBOX_PHRASES.some((phrase) => lower.includes(phrase))
}

/**
 * Envía por Resend. Sin config devuelve id null salvo `required`, que lanza
 * RESEND_NOT_CONFIGURED; el error de sandbox se traduce a una pista accionable.
 */
export async function sendEmail(
  input: SendEmailInput,
  options: SendEmailOptions = {}
): Promise<{ id: string | null }> {
  const { required = false } = options

  if (!isResendConfigured()) {
    if (required) {
      throw new Error('RESEND_NOT_CONFIGURED')
    }
    return { id: null }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { data, error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    ...(input.text ? { text: input.text } : {}),
    ...(input.replyTo ? { reply_to: input.replyTo } : {}),
  })

  if (error) {
    const message = error.message
    if (isResendSandboxError(message)) {
      throw new Error(
        `${message} Con onboarding@resend.dev solo puedes enviar a tu cuenta Resend: configura RESEND_INVITE_OVERRIDE_TO en .env.local.`
      )
    }
    throw new Error(message)
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[email sent]', { id: data?.id, to: input.to, subject: input.subject })
  }

  return { id: data?.id ?? null }
}
