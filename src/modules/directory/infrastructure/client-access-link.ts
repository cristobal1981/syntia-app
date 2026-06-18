import { getSiteUrl } from '@/src/modules/auth/infrastructure/supabase/env'
import { sendClientAccessEmail } from '@/src/modules/email/application/send-client-access-email'
import { isResendConfigured } from '@/src/modules/email/infrastructure/resend-env'
import {
  shouldSkipClientInviteEmail,
  shouldUseResendClientInvite,
} from '@/src/modules/directory/infrastructure/directory-env'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export function getPortalAccessRedirectUrl(): string {
  return `${getSiteUrl()}/login/restablecer`
}

export function buildPortalAccessUrlFromToken(
  hashedToken: string,
  type: 'invite' | 'recovery'
): string {
  const url = new URL(getPortalAccessRedirectUrl())
  url.searchParams.set('token_hash', hashedToken)
  url.searchParams.set('type', type)
  return url.toString()
}

export async function generatePortalAccessLink(
  email: string,
  type: 'invite' | 'recovery'
): Promise<string> {
  const supabase = createSupabaseAdminClient()
  const normalized = email.trim().toLowerCase()

  const { data, error } = await supabase.auth.admin.generateLink({
    type,
    email: normalized,
    options: { redirectTo: getPortalAccessRedirectUrl() },
  })

  if (error || !data.user) {
    throw new Error(error?.message ?? 'No se pudo generar el enlace de acceso.')
  }

  const properties = data.properties as
    | {
        action_link?: string
        hashed_token?: string
      }
    | undefined

  const hashedToken = properties?.hashed_token
  if (hashedToken) {
    // Enlace directo a la app: evita PKCE (action_link → ?code= sin code_verifier → 422).
    return buildPortalAccessUrlFromToken(hashedToken, type)
  }

  const link = properties?.action_link
  if (!link) {
    throw new Error('No se pudo generar el enlace de acceso.')
  }

  return link
}

export async function deliverClientAccessEmail(
  clientEmail: string,
  linkType: 'invite' | 'recovery'
): Promise<void> {
  const email = clientEmail.trim().toLowerCase()
  const accessLink = await generatePortalAccessLink(email, linkType)
  await sendClientAccessEmail({
    clientEmail: email,
    accessLink,
    purpose: linkType === 'invite' ? 'invite' : 'recovery',
  })
}

export async function sendClientAccessEmailForClient(
  clientEmail: string
): Promise<void> {
  const email = clientEmail.trim().toLowerCase()

  if (shouldUseResendClientInvite()) {
    if (!isResendConfigured()) {
      throw new Error('RESEND_NOT_CONFIGURED')
    }
    await deliverClientAccessEmail(email, 'recovery')
    return
  }

  if (shouldSkipClientInviteEmail()) {
    throw new Error('INVITE_EMAIL_DISABLED')
  }

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: getPortalAccessRedirectUrl(),
  })

  if (error) {
    if (error.message.toLowerCase().includes('rate limit')) {
      throw new Error('EMAIL_RATE_LIMIT')
    }
    throw new Error(error.message)
  }
}
