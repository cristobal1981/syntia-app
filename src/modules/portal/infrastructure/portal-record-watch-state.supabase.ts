import type { PortalRecordScope } from '@/src/modules/portal/domain/portal-notifications-types'
import { portalWatchStateKey } from '@/src/modules/portal/domain/portal-notifications-types'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

export type PortalRecordWatchStateRow = {
  user_id: string
  record_scope: PortalRecordScope
  record_id: number
  last_state: string | null
  last_is_closed: boolean
  last_attachment_count: number
  firma_due_soon_notified: boolean
  initialized: boolean
  updated_at: string
}

export type PortalRecordWatchStateEntry = {
  lastState?: string
  lastIsClosed: boolean
  lastAttachmentCount: number
  firmaDueSoonNotified: boolean
  initialized: boolean
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
}

export async function fetchWatchStateForUser(
  userId: string
): Promise<PortalRecordWatchStateMap> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_record_watch_state')
    .select(
      'record_scope, record_id, last_state, last_is_closed, last_attachment_count, firma_due_soon_notified, initialized'
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
  >[]) {
    map.set(portalWatchStateKey(row.record_scope, row.record_id), {
      lastState: row.last_state ?? undefined,
      lastIsClosed: row.last_is_closed,
      lastAttachmentCount: row.last_attachment_count,
      firmaDueSoonNotified: row.firma_due_soon_notified,
      initialized: row.initialized,
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
      'record_scope, record_id, last_state, last_is_closed, last_attachment_count, firma_due_soon_notified, initialized'
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
    >[]).map((row) => ({
      user_id: toUserId,
      record_scope: row.record_scope,
      record_id: row.record_id,
      last_state: row.last_state,
      last_is_closed: row.last_is_closed,
      last_attachment_count: row.last_attachment_count,
      firma_due_soon_notified: row.firma_due_soon_notified,
      initialized: row.initialized,
      updated_at: now,
    })),
    { onConflict: 'user_id,record_scope,record_id' }
  )

  if (upsertError) {
    throw new Error(upsertError.message)
  }
}

export async function upsertWatchStateBatch(
  userId: string,
  entries: PortalRecordWatchStateUpsert[]
): Promise<void> {
  if (!entries.length) return

  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()
  const { error } = await supabase.from('portal_record_watch_state').upsert(
    entries.map((entry) => ({
      user_id: userId,
      record_scope: entry.scope,
      record_id: entry.recordId,
      last_state: entry.lastState ?? null,
      last_is_closed: entry.lastIsClosed,
      last_attachment_count: entry.lastAttachmentCount,
      firma_due_soon_notified: entry.firmaDueSoonNotified,
      initialized: entry.initialized,
      updated_at: now,
    })),
    { onConflict: 'user_id,record_scope,record_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}
