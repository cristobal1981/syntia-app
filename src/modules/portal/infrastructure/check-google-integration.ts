import type { IntegrationConnectionStatus } from '@/src/modules/portal/domain/types'
import { isSupabaseConfigured } from '@/src/modules/auth/infrastructure/supabase/env'

export function checkGoogleIntegration(): IntegrationConnectionStatus {
  if (isSupabaseConfigured()) {
    return 'connected'
  }

  return 'pending'
}
