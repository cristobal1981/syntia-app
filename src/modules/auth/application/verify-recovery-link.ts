import type { EmailOtpType, SupabaseClient } from '@supabase/supabase-js'

const RECOVERY_OTP_TYPES = new Set<EmailOtpType>([
  'recovery',
  'invite',
  'signup',
  'magiclink',
  'email',
])

export function parseRecoveryOtpType(
  value: string | null
): EmailOtpType | null {
  if (!value) return null
  return RECOVERY_OTP_TYPES.has(value as EmailOtpType)
    ? (value as EmailOtpType)
    : null
}

export async function verifyRecoveryLink(
  supabase: SupabaseClient,
  params: {
    tokenHash: string | null
    otpType: EmailOtpType | null
    code: string | null
    accessToken?: string
    refreshToken?: string
  }
): Promise<{ ok: true } | { ok: false }> {
  if (params.tokenHash && params.otpType) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: params.tokenHash,
      type: params.otpType,
    })
    return error ? { ok: false } : { ok: true }
  }

  if (params.code) {
    const { error } = await supabase.auth.exchangeCodeForSession(params.code)
    return error ? { ok: false } : { ok: true }
  }

  if (params.accessToken && params.refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: params.accessToken,
      refresh_token: params.refreshToken,
    })
    return error ? { ok: false } : { ok: true }
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session ? { ok: true } : { ok: false }
}
