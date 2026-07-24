'use server'

import { deliverClientAccessEmail } from '@/src/modules/directory/infrastructure/client-access-link'
import { isResendConfigured } from '@/src/modules/email/infrastructure/resend-env'
import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'

export type RequestPasswordResetResult =
  | { ok: true }
  | { ok: false; error: 'not_configured' | 'invalid_email' | 'unknown' }

function isLikelyMissingAuthUser(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message.toLowerCase()
  return (
    message.includes('user not found') ||
    message.includes('not found') ||
    message.includes('no user') ||
    message.includes('invalid email')
  )
}

export async function requestPasswordResetAction(
  _prev: RequestPasswordResetResult | null,
  formData: FormData
): Promise<RequestPasswordResetResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email || !email.includes('@')) {
    return { ok: false, error: 'invalid_email' }
  }

  if (!isSupabaseConfigured() || !isResendConfigured()) {
    return { ok: false, error: 'not_configured' }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    return { ok: false, error: 'not_configured' }
  }

  try {
    await deliverClientAccessEmail(email, 'recovery')
  } catch (error) {
    if (isLikelyMissingAuthUser(error)) {
      return { ok: true }
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error('[requestPasswordResetAction]', error)
    }
    return { ok: false, error: 'unknown' }
  }

  return { ok: true }
}