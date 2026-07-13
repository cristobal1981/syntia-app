'use server'

import { createSupabaseServerClient } from '@/src/modules/auth/infrastructure/supabase/server'
import {
  getSiteUrl,
  isSupabaseConfigured,
} from '@/src/modules/auth/infrastructure/supabase/env'

export type RequestPasswordResetResult =
  | { ok: true }
  | { ok: false; error: 'not_configured' | 'invalid_email' | 'unknown' }

export async function requestPasswordResetAction(
  _prev: RequestPasswordResetResult | null,
  formData: FormData
): Promise<RequestPasswordResetResult> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!email || !email.includes('@')) {
    return { ok: false, error: 'invalid_email' }
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'not_configured' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/login/restablecer`,
  })

  if (error) {
    return { ok: false, error: 'unknown' }
  }

  return { ok: true }
}
