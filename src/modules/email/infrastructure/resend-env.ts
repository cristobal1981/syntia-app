function stripEnvQuotes(value: string | undefined): string {
  const trimmed = value?.trim() ?? ''
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }
  return trimmed
}

export function isResendConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() &&
      stripEnvQuotes(process.env.RESEND_FROM_EMAIL)
  )
}

export function getResendFromEmail(): string {
  const from = stripEnvQuotes(process.env.RESEND_FROM_EMAIL)
  if (!from) {
    throw new Error('RESEND_FROM_EMAIL is not configured')
  }
  return from
}

/** Sandbox Resend: redirige invitaciones a tu bandeja (mismo correo que la cuenta Resend). */
export function getInviteRecipientEmail(clientEmail: string): string {
  const override = stripEnvQuotes(process.env.RESEND_INVITE_OVERRIDE_TO)
  return override || clientEmail.trim().toLowerCase()
}

export function isInviteRecipientOverridden(): boolean {
  return Boolean(stripEnvQuotes(process.env.RESEND_INVITE_OVERRIDE_TO))
}
