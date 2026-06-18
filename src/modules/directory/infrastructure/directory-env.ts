export function isDirectoryMockMode(): boolean {
  if (process.env.NEXT_PUBLIC_AUTH_STUB === 'true') {
    return true
  }
  return !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
}

/** Dev/local: crea auth.users sin enviar invite (evita rate limit Supabase). */
export function shouldSkipClientInviteEmail(): boolean {
  return process.env.PORTAL_SKIP_CLIENT_INVITE_EMAIL === 'true'
}

/** Invitaciones por Resend si hay API key (aunque falte FROM → error explícito). */
export function shouldUseResendClientInvite(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}
