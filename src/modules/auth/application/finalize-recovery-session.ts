'use server'

import { redirect } from 'next/navigation'

import { establishPortalSession } from '@/src/modules/auth/application/establish-portal-session'
import { resolvePortalUserFromAuth } from '@/src/modules/auth/application/resolve-portal-user'
import { createSupabaseServerClient } from '@/src/modules/auth/infrastructure/supabase/server'
import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'

export type FinalizeRecoveryResult =
  | { ok: true }
  | { ok: false; error: 'not_configured' | 'no_session' }

export async function finalizeRecoverySessionAction(): Promise<FinalizeRecoveryResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'not_configured' }
  }

  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'no_session' }
  }

  await establishPortalSession(await resolvePortalUserFromAuth(user))
  redirect('/dashboard')
}
