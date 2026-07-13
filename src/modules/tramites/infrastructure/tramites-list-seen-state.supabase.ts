import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import type { TramitesListSeenState } from '@/src/modules/tramites/domain/tramites-list-seen-state'

type TramitesListSeenStateRow = {
  user_id: string
  open_item_keys: string[]
  initialized: boolean
  updated_at: string
}

export async function fetchTramitesListSeenState(
  userId: string
): Promise<TramitesListSeenState | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('tramites_list_seen_state')
    .select('open_item_keys, initialized')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return null

  const row = data as Pick<
    TramitesListSeenStateRow,
    'open_item_keys' | 'initialized'
  >

  return {
    openItemKeys: Array.isArray(row.open_item_keys) ? row.open_item_keys : [],
    initialized: Boolean(row.initialized),
  }
}

export async function upsertTramitesListSeenState(
  userId: string,
  openItemKeys: string[]
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('tramites_list_seen_state').upsert(
    {
      user_id: userId,
      open_item_keys: openItemKeys,
      initialized: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}
