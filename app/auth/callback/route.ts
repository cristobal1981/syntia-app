import { NextResponse } from 'next/server'

import { establishPortalSession } from '@/src/modules/auth/application/establish-portal-session'
import { mapSupabaseUser } from '@/src/modules/auth/application/map-supabase-user'
import { createSupabaseServerClient } from '@/src/modules/auth/infrastructure/supabase/server'
import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/login?error=oauth_not_configured', request.url))
  }

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=auth_callback', request.url))
  }

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    return NextResponse.redirect(new URL('/login?error=auth_callback', request.url))
  }

  await establishPortalSession(mapSupabaseUser(data.user))
  return NextResponse.redirect(new URL(next, origin))
}
