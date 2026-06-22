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
