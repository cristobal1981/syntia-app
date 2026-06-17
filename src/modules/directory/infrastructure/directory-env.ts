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
