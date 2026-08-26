import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import type { TramitesListSeenState } from '@/src/modules/tramites/domain/tramites-list-seen-state'
import { resolvePortalAccountGroup } from '@/src/modules/colaboradores/application/get-portal-account-group'

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

/** Ver `cloneChatterReadStateForUser`: mismo motivo, misma herencia titular → colaborador. */
export async function cloneTramitesListSeenStateForUser(
  fromUserId: string,
  toUserId: string
): Promise<void> {
  const state = await fetchTramitesListSeenState(fromUserId)
  if (!state?.initialized) return

  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('tramites_list_seen_state').upsert(
    {
      user_id: toUserId,
      open_item_keys: state.openItemKeys,
      initialized: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Titular y colaboradores comparten bandeja (ver `resolvePortalAccountGroup`):
 * se une `openItemKeys` con lo que cada miembro del grupo ya tuviera visto,
 * en vez de sobrescribirlo, para no resucitar el badge de "nuevo" en un
 * miembro que ya había visto más trámites que quien dispara este ack.
 */
export async function upsertTramitesListSeenState(
  userId: string,
  openItemKeys: string[]
): Promise<void> {
  const group = await resolvePortalAccountGroup(userId)
  const supabase = createSupabaseAdminClient()

  const { data, error: fetchError } = await supabase
    .from('tramites_list_seen_state')
    .select('user_id, open_item_keys')
    .in('user_id', group)

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  const existingByUser = new Map<string, string[]>()
  for (const row of (data ?? []) as Pick<
    TramitesListSeenStateRow,
    'user_id' | 'open_item_keys'
  >[]) {
    existingByUser.set(
      row.user_id,
      Array.isArray(row.open_item_keys) ? row.open_item_keys : []
    )
  }

  const now = new Date().toISOString()
  const rows = group.map((memberId) => ({
    user_id: memberId,
    open_item_keys: [
      ...new Set([...(existingByUser.get(memberId) ?? []), ...openItemKeys]),
    ],
    initialized: true,
    updated_at: now,
  }))

  const { error } = await supabase
    .from('tramites_list_seen_state')
    .upsert(rows, { onConflict: 'user_id' })

  if (error) {
    throw new Error(error.message)
  }
}
