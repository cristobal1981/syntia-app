'use server'

import { redirect } from 'next/navigation'

import { establishPortalSession } from '@/src/modules/auth/application/establish-portal-session'
import { mapSupabaseUser } from '@/src/modules/auth/application/map-supabase-user'
import { createSupabaseServerClient } from '@/src/modules/auth/infrastructure/supabase/server'
import {
  getSiteUrl,
  isSupabaseConfigured,
} from '@/src/modules/auth/infrastructure/supabase/env'

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

  await establishPortalSession(mapSupabaseUser(data.user))
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
