'use server'

import { redirect } from 'next/navigation'

import { establishPortalSession } from '@/src/modules/auth/application/establish-portal-session'
import { mapSupabaseUser } from '@/src/modules/auth/application/map-supabase-user'
import {
  authenticateMockUser,
  getMockUserByRole,
} from '@/src/modules/auth/infrastructure/mock-auth-repository'
import type { PortalRole } from '@/src/modules/auth/domain/types'
import { isAuthStubEnabled } from '@/src/modules/auth/infrastructure/auth-env'
import { createSupabaseServerClient } from '@/src/modules/auth/infrastructure/supabase/server'
import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'

export type SignInResult =
  | { ok: true }
  | { ok: false; error: 'invalid_credentials' | 'unknown' }

export async function signInAction(
  _prev: SignInResult | null,
  formData: FormData
): Promise<SignInResult> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error || !data.user) {
      return { ok: false, error: 'invalid_credentials' }
    }

    await establishPortalSession(mapSupabaseUser(data.user))
    redirect('/dashboard')
  }

  const user = await authenticateMockUser({ email, password })
  if (!user) {
    return { ok: false, error: 'invalid_credentials' }
  }

  await establishPortalSession(user)
  redirect('/dashboard')
}

export async function signInAsDemoRoleAction(role: PortalRole): Promise<void> {
  if (!isAuthStubEnabled()) {
    return
  }

  const user = getMockUserByRole(role)
  if (!user) {
    return
  }

  await establishPortalSession(user)
  redirect('/dashboard')
}
