import type { AuthCredentials, PortalUser } from '@/src/modules/auth/domain/types'
import { resolvePortalUserFromAuth } from '@/src/modules/auth/application/resolve-portal-user'
import { createSupabaseServerClient } from '@/src/modules/auth/infrastructure/supabase/server'

/**
 * Adaptador Supabase Auth. Usado cuando NEXT_PUBLIC_SUPABASE_* está configurado.
 */
export interface SupabaseAuthRepository {
  authenticate(credentials: AuthCredentials): Promise<PortalUser | null>
  signOut(): Promise<void>
}

export const supabaseAuthRepository: SupabaseAuthRepository = {
  async authenticate(credentials) {
    const supabase = await createSupabaseServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (error || !data.user) return null
    return resolvePortalUserFromAuth(data.user)
  },

  async signOut() {
    const supabase = await createSupabaseServerClient()
    await supabase.auth.signOut()
  },
}
