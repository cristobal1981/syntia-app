/** Dev/local: crea auth.users sin enviar invite (evita rate limit Supabase). */
export function shouldSkipClientInviteEmail(): boolean {
  return process.env.PORTAL_SKIP_CLIENT_INVITE_EMAIL === 'true'
}

/** Invitaciones por Resend si hay API key (aunque falte FROM → error explícito). */
export function shouldUseResendClientInvite(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}
