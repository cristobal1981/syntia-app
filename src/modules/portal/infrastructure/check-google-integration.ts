import type { IntegrationConnectionStatus } from '@/src/modules/portal/domain/types'
import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'

export function checkGoogleIntegration(): IntegrationConnectionStatus {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim()

  if (clientId) {
    return 'connected'
  }

  if (isSupabaseConfigured()) {
    return 'connected'
  }

  return 'pending'
}
