export type OnboardingTokenStatus = 'active' | 'used' | 'revoked' | 'expired'

type TokenTimestamps = {
  expires_at: string
  used_at: string | null
  revoked_at: string | null
}

export function deriveOnboardingTokenStatus(
  token: TokenTimestamps,
  now = Date.now()
): OnboardingTokenStatus {
  if (token.used_at) return 'used'
  if (token.revoked_at) return 'revoked'
  const expiresAt = new Date(token.expires_at).getTime()
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return 'expired'
  return 'active'
}
