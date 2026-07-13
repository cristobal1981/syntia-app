import { sendClientAccessEmail } from '@/src/modules/email/application/send-client-access-email'

type SendClientInviteEmailInput = {
  clientEmail: string
  inviteLink: string
}

/** @deprecated Usa sendClientAccessEmail. Mantenido para imports existentes. */
export async function sendClientInviteEmail(
  input: SendClientInviteEmailInput
): Promise<void> {
  await sendClientAccessEmail({
    clientEmail: input.clientEmail,
    accessLink: input.inviteLink,
    purpose: 'invite',
  })
}
