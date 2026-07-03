import {
  getOnboardingFormAccessTokenByToken,
  type OnboardingFormAccessToken,
  type OnboardingFormKind,
} from '@/src/modules/onboarding/onboarding-token-repository.supabase'

export type OnboardingTokenValidationError =
  | 'not_found'
  | 'expired'
  | 'used'
  | 'revoked'

export type OnboardingTokenValidationResult =
  | { ok: true; token: OnboardingFormAccessToken }
  | { ok: false; error: OnboardingTokenValidationError }

export async function validateOnboardingToken(input: {
  token: string
  expectedFormKind?: OnboardingFormKind
}): Promise<OnboardingTokenValidationResult> {
  const normalized = input.token.trim()
  if (!normalized) {
    return { ok: false, error: 'not_found' }
  }

  const tokenRecord = await getOnboardingFormAccessTokenByToken(normalized)
  if (!tokenRecord) {
    return { ok: false, error: 'not_found' }
  }

  const expectedKind = input.expectedFormKind ?? 'alta_autonomo'
  if (tokenRecord.form_kind !== expectedKind) {
    return { ok: false, error: 'not_found' }
  }

  if (tokenRecord.revoked_at) {
    return { ok: false, error: 'revoked' }
  }

  if (tokenRecord.used_at) {
    return { ok: false, error: 'used' }
  }

  const expiresAt = new Date(tokenRecord.expires_at).getTime()
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return { ok: false, error: 'expired' }
  }

  return { ok: true, token: tokenRecord }
}
