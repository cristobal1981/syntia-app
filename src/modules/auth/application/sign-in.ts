'use server'

import { redirect } from 'next/navigation'

import { establishPortalSession } from '@/src/modules/auth/application/establish-portal-session'
import { resolvePortalUserFromAuth } from '@/src/modules/auth/application/resolve-portal-user'
import { createSupabaseServerClient } from '@/src/modules/auth/infrastructure/supabase/server'
import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'

export type SignInResult =
  | { ok: true }
  | { ok: false; error: 'invalid_credentials' | 'not_configured' | 'unknown' }

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

  await establishPortalSession(await resolvePortalUserFromAuth(data.user))
  redirect('/dashboard')
}
