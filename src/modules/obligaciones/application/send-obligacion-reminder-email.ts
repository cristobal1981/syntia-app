import {
  buildObligacionReminderDigestEmail,
  type ObligacionReminderDigestItem,
} from '@/content/obligacion-reminder-email'
import { sendEmail } from '@/src/modules/email/infrastructure/send-email'
import {
  getInviteRecipientEmail,
  isInviteRecipientOverridden,
} from '@/src/modules/email/infrastructure/resend-env'

type SendObligacionReminderDigestEmailInput = {
  to: string
  items: ObligacionReminderDigestItem[]
}

/**
 * En local/preview, `RESEND_INVITE_OVERRIDE_TO` redirige el envío a tu
 * bandeja de prueba en vez de al staff real (nunca en producción de
 * Vercel — ver `resend-env.ts`). Sin esto, probar el cron en dev mandaría
 * el aviso real a un admin/gestor real.
 */
export async function sendObligacionReminderDigestEmail(
  input: SendObligacionReminderDigestEmailInput
): Promise<void> {
  const to = getInviteRecipientEmail(input.to)

  const { subject, html, text } = buildObligacionReminderDigestEmail({
    items: input.items,
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
