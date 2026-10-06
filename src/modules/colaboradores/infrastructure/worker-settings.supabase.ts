import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

const DEFAULT_MAX_WORKERS = 5

export type WorkerSettingsRow = {
  workers_enabled: boolean
  max_workers: number
}

export async function getWorkerSettings(
  ownerUserId: string
): Promise<WorkerSettingsRow> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('client_integrations')
    .select('workers_enabled, max_workers')
    .eq('user_id', ownerUserId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return {
    workers_enabled: data?.workers_enabled ?? false,
    max_workers: data?.max_workers ?? DEFAULT_MAX_WORKERS,
  }
}

/**
 * Un colaborador nunca debe seguir activo si su titular (el cliente real)
 * ya no puede acceder él mismo — ni archivado ni desactivado. No basta con
 * `workers_enabled`: ese toggle es una decisión explícita del titular,
 * independiente de si su propia cuenta sigue activa.
 */
export async function isOwnerAccountActive(ownerUserId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select('status, is_active')
    .eq('id', ownerUserId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return false
  if (data.is_active === false) return false
  if (typeof data.status === 'string' && data.status.toLowerCase() === 'archived') return false
  return true
}

export async function setWorkersEnabled(
  ownerUserId: string,
  enabled: boolean
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('client_integrations').upsert(
    {
      user_id: ownerUserId,
      workers_enabled: enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}
