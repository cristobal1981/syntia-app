import { buildAltaAutonomoAccessEmail } from '@/content/portal-alta-autonomo-email'
import { sendEmail } from '@/src/modules/email/infrastructure/send-email'
import {
  getInviteRecipientEmail,
  isInviteRecipientOverridden,
} from '@/src/modules/email/infrastructure/resend-env'

type SendAltaAutonomoAccessEmailInput = {
  clientEmail: string
  clientFirstName?: string | null
  accessLink: string
  expiresAt: string
}

export async function sendAltaAutonomoAccessEmail(
  input: SendAltaAutonomoAccessEmailInput
): Promise<{ emailId: string | null }> {
  const to = getInviteRecipientEmail(input.clientEmail)
  const { subject, html, text } = buildAltaAutonomoAccessEmail({
    accessLink: input.accessLink,
    clientEmail: input.clientEmail,
    clientFirstName: input.clientFirstName,
    expiresAt: input.expiresAt,
    isOverrideRecipient: isInviteRecipientOverridden(),
  })

  const { id } = await sendEmail(
    {
      to,
      subject,
      html,
      text,
    },
    { required: true }
  )

  return { emailId: id }
}
