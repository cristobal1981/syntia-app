import { buildObligacionReminderEmail } from '@/content/obligacion-reminder-email'
import { getSiteUrl } from '@/src/modules/auth/infrastructure/supabase/env'
import { sendEmail } from '@/src/modules/email/infrastructure/send-email'
import {
  getInviteRecipientEmail,
  isInviteRecipientOverridden,
} from '@/src/modules/email/infrastructure/resend-env'

type SendObligacionReminderEmailInput = {
  to: string
  modelLabel: string
  deadline: Date
  daysLeft: number
}

/**
 * En local/preview, `RESEND_INVITE_OVERRIDE_TO` redirige el envío a tu
 * bandeja de prueba en vez de al cliente real (nunca en producción de
 * Vercel — ver `resend-env.ts`). Sin esto, probar el cron en dev mandaría
 * el aviso real a un cliente real.
 */
export async function sendObligacionReminderEmail(
  input: SendObligacionReminderEmailInput
): Promise<void> {
  const deadlineLabel = input.deadline.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const to = getInviteRecipientEmail(input.to)

  const { subject, html, text } = buildObligacionReminderEmail({
    modelLabel: input.modelLabel,
    deadlineLabel,
    daysLeft: input.daysLeft,
    portalUrl: `${getSiteUrl()}/obligaciones`,
    realRecipientEmail: input.to,
    isOverrideRecipient: isInviteRecipientOverridden(),
  })

  await sendEmail(
    {
      to,
      subject,
      html,
      text,
    },
    { required: false }
  )
}
