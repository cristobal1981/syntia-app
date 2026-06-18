import { Resend } from 'resend'

import type { SendEmailInput } from '@/src/modules/email/domain/types'
import {
  getResendFromEmail,
  isResendConfigured,
} from '@/src/modules/email/infrastructure/resend-env'

type SendEmailOptions = {
  /** Si true, no hace stub silencioso: lanza si falta config. */
  required?: boolean
}

export async function sendEmail(
  input: SendEmailInput,
  options: SendEmailOptions = {}
): Promise<void> {
  const { required = false } = options

  if (!isResendConfigured()) {
    if (required) {
      throw new Error('RESEND_NOT_CONFIGURED')
    }
    if (process.env.NODE_ENV !== 'production') {
      console.info('[email stub]', input)
    }
    return
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
    if (
      message.toLowerCase().includes('testing') ||
      message.toLowerCase().includes('verify a domain') ||
      message.toLowerCase().includes('only send')
    ) {
      throw new Error(
        `${message} Con onboarding@resend.dev solo puedes enviar a tu cuenta Resend: configura RESEND_INVITE_OVERRIDE_TO en .env.local.`
      )
    }
    throw new Error(message)
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[email sent]', { id: data?.id, to: input.to, subject: input.subject })
  }
}
