import { NextResponse } from 'next/server'

import { establishPortalSession } from '@/src/modules/auth/application/establish-portal-session'
import { resolvePortalUserFromAuth } from '@/src/modules/auth/application/resolve-portal-user'
import { createSupabaseServerClient } from '@/src/modules/auth/infrastructure/supabase/server'
import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'
import { getWorkerAccessStatus } from '@/src/modules/colaboradores/application/get-worker-access-status'

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

  const user = await resolvePortalUserFromAuth(data.user)
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=account_disabled', request.url))
  }

  if (user.role === 'worker') {
    const { active } = await getWorkerAccessStatus(user)
    if (!active) {
      return NextResponse.redirect(
        new URL('/login?error=worker_access_disabled', request.url)
      )
    }
  }

  await establishPortalSession(user)
  const destination = new URL(next, origin)
  destination.searchParams.set('entering', '1')
  return NextResponse.redirect(destination)
}
