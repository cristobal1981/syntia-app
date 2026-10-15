import { buildClientInvitationEmail } from '@/content/client-invitation-email'
import { getSiteUrl } from '@/src/modules/auth/infrastructure/supabase/env'
import {
  getInviteRecipientEmail,
  isInviteRecipientOverridden,
} from '@/src/modules/email/infrastructure/resend-env'
import { sendEmail } from '@/src/modules/email/infrastructure/send-email'

/**
 * Manda la invitación. En local/preview, `RESEND_INVITE_OVERRIDE_TO` la
 * redirige a la bandeja de prueba (nunca en producción de Vercel — ver
 * `resend-env.ts`). Con Resend sin configurar lanza: quien llama no debe
 * contar como enviada una invitación que no salió.
 */
export async function sendClientInvitationEmail(input: {
  inviteeEmail: string
}): Promise<void> {
  const to = getInviteRecipientEmail(input.inviteeEmail)
  const { subject, html, text } = buildClientInvitationEmail({
    siteUrl: getSiteUrl(),
    inviteeEmail: input.inviteeEmail,
    isOverrideRecipient: isInviteRecipientOverridden(),
  })

  await sendEmail({ to, subject, html, text }, { required: true })
}
