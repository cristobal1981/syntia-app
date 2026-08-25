'use server'

import { redirect } from 'next/navigation'

import { establishPortalSession } from '@/src/modules/auth/application/establish-portal-session'
import { resolvePortalUserFromAuth } from '@/src/modules/auth/application/resolve-portal-user'
import { createSupabaseServerClient } from '@/src/modules/auth/infrastructure/supabase/server'
import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'
import { getWorkerAccessStatus } from '@/src/modules/colaboradores/application/get-worker-access-status'

export type SignInResult =
  | { ok: true }
  | {
      ok: false
      error:
        | 'invalid_credentials'
        | 'not_configured'
        | 'unknown'
        | 'worker_access_disabled'
        | 'account_disabled'
    }

export async function signInAction(
  _prev: SignInResult | null,
  formData: FormData
): Promise<SignInResult> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'not_configured' }
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error || !data.user) {
    return { ok: false, error: 'invalid_credentials' }
  }

  const user = await resolvePortalUserFromAuth(data.user)
  if (!user) {
    return { ok: false, error: 'account_disabled' }
  }

  if (user.role === 'worker') {
    const { active } = await getWorkerAccessStatus(user)
    if (!active) {
      return { ok: false, error: 'worker_access_disabled' }
    }
  }

  await establishPortalSession(user)
  redirect('/dashboard')
}
