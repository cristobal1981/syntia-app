'use server'

import { redirect } from 'next/navigation'

import { establishPortalSession } from '@/src/modules/auth/application/establish-portal-session'
import { resolvePortalUserFromAuth } from '@/src/modules/auth/application/resolve-portal-user'
import { createSupabaseServerClient } from '@/src/modules/auth/infrastructure/supabase/server'
import {
  getSiteUrl,
  isSupabaseConfigured,
} from '@/src/modules/auth/infrastructure/supabase/env'
import { getWorkerAccessStatus } from '@/src/modules/colaboradores/application/get-worker-access-status'

export async function signInWithGoogleIdTokenAction(credential: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=oauth_not_configured')
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: credential,
  })

  if (error || !data.user) {
    redirect('/login?error=oauth_failed')
  }

  const user = await resolvePortalUserFromAuth(data.user)
  if (!user) {
    redirect('/login?error=account_disabled')
  }

  if (user.role === 'worker') {
    const { active } = await getWorkerAccessStatus(user)
    if (!active) {
      redirect('/login?error=worker_access_disabled')
    }
  }

  await establishPortalSession(user)
  redirect('/dashboard')
}

/** Redirect OAuth fallback cuando no hay Client ID o falla GIS. */
export async function signInWithGoogleAction(): Promise<void> {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=oauth_not_configured')
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error || !data.url) {
    redirect('/login?error=oauth_failed')
  }

  redirect(data.url)
}
