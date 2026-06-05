'use client'

import { createBrowserClient } from '@supabase/ssr'

import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'

export function createSupabaseBrowserClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no configurado')
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

export function isSupabaseBrowserConfigured(): boolean {
  return isSupabaseConfigured()
}
