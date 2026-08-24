import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import { chatterReadStateKey } from '@/src/modules/portal/domain/chatter-notifications-types'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export type ChatterReadStateRow = {
  user_id: string
  record_kind: PortalRecordKind
  record_id: number
  last_seen_message_id: number
  updated_at: string
}

export async function fetchChatterReadStateForUser(
  userId: string
): Promise<Map<string, number>> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('chatter_read_state')
    .select('record_kind, record_id, last_seen_message_id')
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }

  const map = new Map<string, number>()
  for (const row of (data ?? []) as Pick<
    ChatterReadStateRow,
    'record_kind' | 'record_id' | 'last_seen_message_id'
  >[]) {
    map.set(
      chatterReadStateKey(row.record_kind, row.record_id),
      row.last_seen_message_id
    )
  }
  return map
}

export async function upsertChatterReadState(
  userId: string,
  recordKind: PortalRecordKind,
  recordId: number,
  lastSeenMessageId: number
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('chatter_read_state').upsert(
    {
      user_id: userId,
      record_kind: recordKind,
      record_id: recordId,
      last_seen_message_id: lastSeenMessageId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,record_kind,record_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Un colaborador nuevo hereda el baseline de lectura del titular en vez de
 * arrancar en blanco: si no, el bootstrap de `findUnreadChatterCandidatesForRecords`
 * marca como "sin leer" el último mensaje del gestor en cada trámite abierto,
 * aunque el titular ya lo hubiera leído hace tiempo.
 */
export async function cloneChatterReadStateForUser(
  fromUserId: string,
  toUserId: string
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('chatter_read_state')
    .select('record_kind, record_id, last_seen_message_id')
    .eq('user_id', fromUserId)

  if (error) {
    throw new Error(error.message)
  }
  if (!data?.length) return

  const now = new Date().toISOString()
  const { error: upsertError } = await supabase.from('chatter_read_state').upsert(
    (data as Pick<
      ChatterReadStateRow,
      'record_kind' | 'record_id' | 'last_seen_message_id'
    >[]).map((row) => ({
      user_id: toUserId,
      record_kind: row.record_kind,
      record_id: row.record_id,
      last_seen_message_id: row.last_seen_message_id,
      updated_at: now,
    })),
    { onConflict: 'user_id,record_kind,record_id' }
  )

  if (upsertError) {
    throw new Error(upsertError.message)
  }
}

export async function upsertChatterReadStateBatch(
  userId: string,
  entries: Array<{
    recordKind: PortalRecordKind
    recordId: number
    lastSeenMessageId: number
  }>
): Promise<void> {
  if (!entries.length) return

  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from('chatter_read_state').upsert(
    entries.map((entry) => ({
      user_id: userId,
      record_kind: entry.recordKind,
      record_id: entry.recordId,
      last_seen_message_id: entry.lastSeenMessageId,
      updated_at: now,
    })),
    { onConflict: 'user_id,record_kind,record_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}
