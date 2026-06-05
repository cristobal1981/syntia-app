import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase no configurado')
  }

  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(
          cookiesToSet: {
            name: string
            value: string
            options?: Parameters<typeof cookieStore.set>[2]
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll desde Server Component puede fallar; la route sí puede escribir cookies
          }
        },
      },
    }
  )
}
