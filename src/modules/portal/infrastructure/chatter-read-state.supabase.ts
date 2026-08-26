import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'
import { chatterReadStateKey } from '@/src/modules/portal/domain/chatter-notifications-types'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import { resolvePortalAccountGroup } from '@/src/modules/colaboradores/application/get-portal-account-group'

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
  await upsertChatterReadStateBatch(userId, [
    { recordKind, recordId, lastSeenMessageId },
  ])
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

/**
 * Titular y colaboradores comparten bandeja (ver `resolvePortalAccountGroup`):
 * el nuevo `last_seen_message_id` se propaga a todo el grupo, tomando el
 * máximo con lo que cada miembro ya tuviera para no retroceder su lectura si
 * había avanzado más que `userId` en ese hilo.
 */
export async function upsertChatterReadStateBatch(
  userId: string,
  entries: Array<{
    recordKind: PortalRecordKind
    recordId: number
    lastSeenMessageId: number
  }>
): Promise<void> {
  if (!entries.length) return

  const group = await resolvePortalAccountGroup(userId)
  const supabase = createSupabaseAdminClient()

  const { data, error: fetchError } = await supabase
    .from('chatter_read_state')
    .select('user_id, record_kind, record_id, last_seen_message_id')
    .in('user_id', group)

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  const existing = new Map<string, number>()
  for (const row of (data ?? []) as Pick<
    ChatterReadStateRow,
    'user_id' | 'record_kind' | 'record_id' | 'last_seen_message_id'
  >[]) {
    existing.set(
      `${row.user_id}:${chatterReadStateKey(row.record_kind, row.record_id)}`,
      row.last_seen_message_id
    )
  }

  const now = new Date().toISOString()
  const rows = group.flatMap((memberId) =>
    entries.map((entry) => {
      const current =
        existing.get(
          `${memberId}:${chatterReadStateKey(entry.recordKind, entry.recordId)}`
        ) ?? 0

      return {
        user_id: memberId,
        record_kind: entry.recordKind,
        record_id: entry.recordId,
        last_seen_message_id: Math.max(current, entry.lastSeenMessageId),
        updated_at: now,
      }
    })
  )

  const { error } = await supabase
    .from('chatter_read_state')
    .upsert(rows, { onConflict: 'user_id,record_kind,record_id' })

  if (error) {
    throw new Error(error.message)
  }
}
