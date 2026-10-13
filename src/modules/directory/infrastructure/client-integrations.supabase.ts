import { revalidateTag, unstable_cache } from 'next/cache'

import {
  CLIENT_INTEGRATION_SELECT,
  type ClientIntegrationRow,
} from '@/src/modules/directory/domain/map-directory-row'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export async function fetchClientIntegrationMap(ids?: string[]) {
  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from('client_integrations')
    .select(CLIENT_INTEGRATION_SELECT)

  if (ids?.length) {
    query = query.in('user_id', ids)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return new Map(
    ((data ?? []) as ClientIntegrationRow[]).map((row) => [row.user_id, row])
  )
}

const CLIENT_DRIVE_ROOT_REVALIDATE_SECONDS = 300

export function clientDriveRootCacheTag(userId: string): string {
  return `client-drive-root:${userId}`
}

/**
 * Carpeta Pública de Drive del cliente, cacheada para no consultar Supabase en
 * cada acción de Documentos. Cualquier escritura de `client_integrations` la
 * invalida (ver `invalidateClientDriveRoot`), así que el TTL solo cubre cambios
 * hechos fuera de la app.
 */
export async function getCachedClientDriveRootId(userId: string): Promise<string | null> {
  const cached = unstable_cache(
    async () => {
      const integration = await getClientIntegrationByUserId(userId)
      return integration?.drive_folder_id?.trim() || null
    },
    ['client-drive-root', userId],
    {
      revalidate: CLIENT_DRIVE_ROOT_REVALIDATE_SECONDS,
      tags: [clientDriveRootCacheTag(userId)],
    }
  )

  return cached()
}

/** Expira al instante la carpeta cacheada; la siguiente lectura vuelve a la base de datos. */
function invalidateClientDriveRoot(userId: string): void {
  try {
    revalidateTag(clientDriveRootCacheTag(userId), { expire: 0 })
  } catch {
    // Fuera de una petición de Next (scripts, migraciones) no hay caché que
    // invalidar; el TTL cubre cualquier lectura posterior.
  }
}

export async function upsertClientIntegration(
  userId: string,
  fields: Pick<ClientIntegrationRow, 'odoo_partner_id' | 'drive_folder_id'>
) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('client_integrations').upsert(
    {
      user_id: userId,
      ...fields,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
  invalidateClientDriveRoot(userId)
}

export async function deleteClientIntegration(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('client_integrations')
    .delete()
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }
  invalidateClientDriveRoot(userId)
}

export async function getClientIntegrationByUserId(userId: string) {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('client_integrations')
    .select(CLIENT_INTEGRATION_SELECT)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return (data as ClientIntegrationRow | null) ?? null
}
