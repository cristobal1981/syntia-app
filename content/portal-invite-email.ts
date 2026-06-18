import { buildClientAccessEmail } from '@/content/portal-client-access-email'

type ClientInviteEmailParams = {
  inviteLink: string
  clientEmail: string
  isOverrideRecipient: boolean
}

/** @deprecated Usa buildClientAccessEmail. */
export function buildClientInviteEmail({
  inviteLink,
  clientEmail,
  isOverrideRecipient,
}: ClientInviteEmailParams) {
  return buildClientAccessEmail({
    accessLink: inviteLink,
    clientEmail,
    purpose: 'invite',
    isOverrideRecipient,
  })
}
