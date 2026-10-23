import type { PortalRecordScope } from '@/src/modules/portal/domain/portal-notifications-types'
import { portalWatchStateKey } from '@/src/modules/portal/domain/portal-notifications-types'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import { resolvePortalAccountGroup } from '@/src/modules/colaboradores/application/get-portal-account-group'

type PortalRecordWatchStateRow = {
  user_id: string
  record_scope: PortalRecordScope
  record_id: number
  last_state: string | null
  last_is_closed: boolean
  last_attachment_count: number
  firma_due_soon_notified: boolean
  initialized: boolean
  last_assignee_key: string | null
  updated_at: string
}

export type PortalRecordWatchStateEntry = {
  lastState?: string
  lastIsClosed: boolean
  lastAttachmentCount: number
  firmaDueSoonNotified: boolean
  initialized: boolean
  /** Huella de los responsables vistos (ver `assigneeKeyFor`); `undefined` = fila anterior a la columna. */
  lastAssigneeKey?: string
}

export type PortalRecordWatchStateMap = Map<string, PortalRecordWatchStateEntry>

export type PortalRecordWatchStateUpsert = {
  scope: PortalRecordScope
  recordId: number
  lastState?: string
  lastIsClosed: boolean
  lastAttachmentCount: number
  firmaDueSoonNotified: boolean
  initialized: boolean
  /** Quien escriba el seguimiento debe pasar aquí el valor anterior si no lo cambia: omitirlo lo borraría. */
  lastAssigneeKey?: string
}

export async function fetchWatchStateForUser(
  userId: string
): Promise<PortalRecordWatchStateMap> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_record_watch_state')
    .select(
      'record_scope, record_id, last_state, last_is_closed, last_attachment_count, firma_due_soon_notified, initialized, last_assignee_key'
    )
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }

  const map: PortalRecordWatchStateMap = new Map()
  for (const row of (data ?? []) as Pick<
    PortalRecordWatchStateRow,
    | 'record_scope'
    | 'record_id'
    | 'last_state'
    | 'last_is_closed'
    | 'last_attachment_count'
    | 'firma_due_soon_notified'
    | 'initialized'
    | 'last_assignee_key'
  >[]) {
    map.set(portalWatchStateKey(row.record_scope, row.record_id), {
      lastState: row.last_state ?? undefined,
      lastIsClosed: row.last_is_closed,
      lastAttachmentCount: row.last_attachment_count,
      firmaDueSoonNotified: row.firma_due_soon_notified,
      initialized: row.initialized,
      lastAssigneeKey: row.last_assignee_key ?? undefined,
    })
  }
  return map
}

/** Ver `cloneChatterReadStateForUser`: mismo motivo, misma herencia titular → colaborador. */
export async function cloneWatchStateForUser(
  fromUserId: string,
  toUserId: string
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_record_watch_state')
    .select(
      'record_scope, record_id, last_state, last_is_closed, last_attachment_count, firma_due_soon_notified, initialized, last_assignee_key'
    )
    .eq('user_id', fromUserId)

  if (error) {
    throw new Error(error.message)
  }
  if (!data?.length) return

  const now = new Date().toISOString()
  const { error: upsertError } = await supabase.from('portal_record_watch_state').upsert(
    (data as Pick<
      PortalRecordWatchStateRow,
      | 'record_scope'
      | 'record_id'
      | 'last_state'
      | 'last_is_closed'
      | 'last_attachment_count'
      | 'firma_due_soon_notified'
      | 'initialized'
      | 'last_assignee_key'
    >[]).map((row) => ({
      user_id: toUserId,
      record_scope: row.record_scope,
      record_id: row.record_id,
      last_state: row.last_state,
      last_is_closed: row.last_is_closed,
      last_attachment_count: row.last_attachment_count,
      firma_due_soon_notified: row.firma_due_soon_notified,
      initialized: row.initialized,
      last_assignee_key: row.last_assignee_key,
      updated_at: now,
    })),
    { onConflict: 'user_id,record_scope,record_id' }
  )

  if (upsertError) {
    throw new Error(upsertError.message)
  }
}

/**
 * Titular y colaboradores comparten bandeja (ver `resolvePortalAccountGroup`):
 * el snapshot del registro es el mismo para todos, así que se replica tal
 * cual a cada miembro del grupo en vez de solo a `userId`.
 */
export async function upsertWatchStateBatch(
  userId: string,
  entries: PortalRecordWatchStateUpsert[]
): Promise<void> {
  if (!entries.length) return

  const group = await resolvePortalAccountGroup(userId)
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const rows = group.flatMap((memberId) =>
    entries.map((entry) => ({
      user_id: memberId,
      record_scope: entry.scope,
      record_id: entry.recordId,
      last_state: entry.lastState ?? null,
      last_is_closed: entry.lastIsClosed,
      last_attachment_count: entry.lastAttachmentCount,
      firma_due_soon_notified: entry.firmaDueSoonNotified,
      initialized: entry.initialized,
      last_assignee_key: entry.lastAssigneeKey ?? null,
      updated_at: now,
    }))
  )

  const { error } = await supabase
    .from('portal_record_watch_state')
    .upsert(rows, { onConflict: 'user_id,record_scope,record_id' })

  if (error) {
    throw new Error(error.message)
  }
}
