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
  /** Completas del mismo aviso, para el resumen del correo. */
  completeCount?: number
}

/**
 * En local/preview, `RESEND_INVITE_OVERRIDE_TO` redirige el envío a tu
 * bandeja de prueba en vez de al staff real (nunca en producción de
 * Vercel — ver `resend-env.ts`). Sin esto, probar el cron en dev mandaría
 * el aviso real a un admin/gestor real.
 *
 * Devuelve `true` solo si Resend confirmó el envío (id recibido). Con Resend
 * sin configurar devuelve `false` sin lanzar, para que el cron NO dé por
 * enviado un aviso que nunca salió.
 */
export async function sendObligacionReminderDigestEmail(
  input: SendObligacionReminderDigestEmailInput
): Promise<boolean> {
  const to = getInviteRecipientEmail(input.to)

  const { subject, html, text } = buildObligacionReminderDigestEmail({
    items: input.items,
    completeCount: input.completeCount,
    realRecipientEmail: input.to,
    isOverrideRecipient: isInviteRecipientOverridden(),
  })

  const { id } = await sendEmail(
    {
      to,
      subject,
      html,
      text,
    },
    { required: false }
  )
  return id !== null
}
