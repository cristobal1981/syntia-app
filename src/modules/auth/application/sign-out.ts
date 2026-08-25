'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

import { SESSION_COOKIE_NAME } from '@/src/modules/auth/domain/types'
import { createSupabaseServerClient } from '@/src/modules/auth/infrastructure/supabase/server'
import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient()
      await supabase.auth.signOut()
    } catch {
      // La cookie de sesión del portal es la que de verdad controla el
      // acceso (ver get-session.ts) — si Supabase falla al cerrar su propia
      // sesión, no por eso dejamos a alguien con la sesión local abierta.
    }
  }

  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}

export async function signOut(): Promise<void> {
  await signOutAction()
  redirect('/login')
}
