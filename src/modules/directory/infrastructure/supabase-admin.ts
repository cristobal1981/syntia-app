import { createClient } from '@supabase/supabase-js'

import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'

export function isSupabaseServiceRoleConfigured(): boolean {
  return Boolean(
    isSupabaseConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  )
}

export function createSupabaseAdminClient() {
  if (!isSupabaseServiceRoleConfigured()) {
    throw new Error('Supabase service role no configurado')
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
