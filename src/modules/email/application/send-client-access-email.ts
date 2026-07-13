import { buildClientAccessEmail } from '@/content/portal-client-access-email'
import { sendEmail } from '@/src/modules/email/infrastructure/send-email'
import {
  getInviteRecipientEmail,
  isInviteRecipientOverridden,
} from '@/src/modules/email/infrastructure/resend-env'

type SendClientAccessEmailInput = {
  clientEmail: string
  accessLink: string
  purpose: 'invite' | 'recovery'
}

export async function sendClientAccessEmail(
  input: SendClientAccessEmailInput
): Promise<void> {
  const to = getInviteRecipientEmail(input.clientEmail)
  const { subject, html, text } = buildClientAccessEmail({
    accessLink: input.accessLink,
    clientEmail: input.clientEmail,
    purpose: input.purpose,
    isOverrideRecipient: isInviteRecipientOverridden(),
  })

  await sendEmail(
    {
      to,
      subject,
      html,
      text,
    },
    { required: true }
  )
}
