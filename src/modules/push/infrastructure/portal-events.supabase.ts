import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import type {
  PortalEventInput,
  PortalEventKind,
  PortalEventRow,
} from '@/src/modules/push/domain/portal-event'
import type { PortalRecordScope } from '@/src/modules/portal/domain/portal-notifications-types'

type PortalEventDbRow = {
  seq: number
  event_id: string
  partner_id: number
  kind: PortalEventKind
  scope: PortalRecordScope
  record_id: number
  record_name: string
  state_label: string | null
  previous_state_label: string | null
  message_id: number | null
  excerpt: string | null
  by_client: boolean
  occurred_at: string
  received_at: string
}

const COLUMNS =
  'seq, event_id, partner_id, kind, scope, record_id, record_name, state_label, previous_state_label, message_id, excerpt, by_client, occurred_at, received_at'

function toRow(row: PortalEventDbRow): PortalEventRow {
  return {
    seq: row.seq,
    eventId: row.event_id,
    partnerId: row.partner_id,
    kind: row.kind,
    scope: row.scope,
    recordId: row.record_id,
    recordName: row.record_name,
    stateLabel: row.state_label,
    previousStateLabel: row.previous_state_label,
    messageId: row.message_id,
    excerpt: row.excerpt,
    byClient: row.by_client,
    occurredAt: row.occurred_at,
    receivedAt: row.received_at,
  }
}

/** `duplicate`: Odoo reenvió un evento que ya estaba guardado. */
export async function insertPortalEvent(
  event: PortalEventInput
): Promise<'created' | 'duplicate'> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_events')
    .upsert(
      {
        event_id: event.eventId,
        partner_id: event.partnerId,
        kind: event.kind,
        scope: event.scope,
        record_id: event.recordId,
        record_name: event.recordName,
        state_label: event.stateLabel,
        previous_state_label: event.previousStateLabel,
        message_id: event.messageId,
        excerpt: event.excerpt,
        by_client: event.byClient,
        occurred_at: event.occurredAt,
      },
      { onConflict: 'event_id', ignoreDuplicates: true }
    )
    .select('seq')

  if (error) throw new Error(error.message)
  return (data?.length ?? 0) > 0 ? 'created' : 'duplicate'
}

/** Último estado visible guardado de ese registro, o `null` si no hay (los eventos se conservan 2 días). */
export async function getLastStatusLabel(
  scope: PortalRecordScope,
  recordId: number
): Promise<string | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_events')
    .select('state_label')
    .eq('kind', 'status')
    .eq('scope', scope)
    .eq('record_id', recordId)
    .order('seq', { ascending: false })
    .limit(1)

  if (error) throw new Error(error.message)
  return (data?.[0] as { state_label: string | null } | undefined)?.state_label ?? null
}

/** Último `seq` guardado (0 si no hay eventos). */
export async function getMaxPortalEventSeq(): Promise<number> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_events')
    .select('seq')
    .order('seq', { ascending: false })
    .limit(1)

  if (error) throw new Error(error.message)
  return (data?.[0] as { seq: number } | undefined)?.seq ?? 0
}

/**
 * Eventos posteriores a `afterSeq` que ya llevan un rato guardados (los
 * recientes esperan a la siguiente ejecución para agruparse), de más antiguo a
 * más nuevo y hasta `limit`.
 */
export async function listMaturePortalEvents(
  afterSeq: number,
  receivedBefore: Date,
  limit: number
): Promise<PortalEventRow[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_events')
    .select(COLUMNS)
    .gt('seq', afterSeq)
    .lte('received_at', receivedBefore.toISOString())
    .order('seq', { ascending: true })
    .limit(limit)

  if (error) throw new Error(error.message)
  return ((data ?? []) as PortalEventDbRow[]).map(toRow)
}
