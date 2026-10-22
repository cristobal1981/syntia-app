import type {
  PortalNotification,
  PortalNotificationReason,
  PortalRecordScope,
} from '@/src/modules/portal/domain/portal-notifications-types'
import { htmlToPushPreview } from '@/src/modules/push/domain/push-text'

export type PortalEventKind = 'message' | 'status' | 'new_record' | 'new_firma'

/** Lo que se guarda de un evento de Odoo (sin `seq` ni fecha de llegada). */
export type PortalEventInput = {
  eventId: string
  partnerId: number
  kind: PortalEventKind
  scope: PortalRecordScope
  recordId: number
  recordName: string
  stateLabel: string | null
  previousStateLabel: string | null
  messageId: number | null
  /** Texto plano y corto del mensaje (nunca el HTML de Odoo). */
  excerpt: string | null
  byClient: boolean
  /** ISO 8601. */
  occurredAt: string
}

/** Un evento ya guardado. */
export type PortalEventRow = PortalEventInput & {
  seq: number
  receivedAt: string
}

const KINDS: ReadonlySet<string> = new Set(['message', 'status', 'new_record', 'new_firma'])
const SCOPES: ReadonlySet<string> = new Set(['tramite', 'consulta', 'obligacion', 'firma'])

const MAX_EVENT_ID_LENGTH = 200
const MAX_NAME_LENGTH = 200
const MAX_LABEL_LENGTH = 100
/** Se ignora lo que pase de aquí antes de sanear, para no gastar CPU con cuerpos enormes. */
const MAX_BODY_LENGTH = 50_000

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null
  const text = value.replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, max) : null
}

/**
 * Valida el cuerpo que manda la acción automatizada de Odoo. Devuelve el
 * evento limpio o `null` si algo no cuadra. El HTML del mensaje
 * (`message_body`) se sanea y se reduce a un extracto: lo demás no se guarda.
 */
export function parsePortalEventInput(input: unknown): PortalEventInput | null {
  if (typeof input !== 'object' || input === null) return null
  const raw = input as Record<string, unknown>

  const eventId = boundedText(raw.event_id, MAX_EVENT_ID_LENGTH)
  const partnerId = positiveInteger(raw.partner_id)
  const recordId = positiveInteger(raw.record_id)
  const recordName = boundedText(raw.record_name, MAX_NAME_LENGTH)
  if (!eventId || !partnerId || !recordId || !recordName) return null

  if (typeof raw.kind !== 'string' || !KINDS.has(raw.kind)) return null
  if (typeof raw.scope !== 'string' || !SCOPES.has(raw.scope)) return null
  const kind = raw.kind as PortalEventKind
  const scope = raw.scope as PortalRecordScope

  // Una firma solo genera «nueva firma»; el resto de tipos son de tareas.
  if ((kind === 'new_firma') !== (scope === 'firma')) return null

  const messageId = raw.message_id === undefined || raw.message_id === null
    ? null
    : positiveInteger(raw.message_id)
  if (raw.message_id !== undefined && raw.message_id !== null && messageId === null) return null
  if (kind === 'message' && messageId === null) return null

  if (typeof raw.occurred_at !== 'string') return null
  const occurred = new Date(raw.occurred_at)
  if (Number.isNaN(occurred.getTime())) return null

  if (raw.by_client !== undefined && typeof raw.by_client !== 'boolean') return null

  const body = typeof raw.message_body === 'string' ? raw.message_body.slice(0, MAX_BODY_LENGTH) : null

  return {
    eventId,
    partnerId,
    kind,
    scope,
    recordId,
    recordName,
    stateLabel: boundedText(raw.state_label, MAX_LABEL_LENGTH),
    previousStateLabel: boundedText(raw.previous_state_label, MAX_LABEL_LENGTH),
    messageId,
    excerpt: kind === 'message' ? htmlToPushPreview(body) : null,
    byClient: raw.by_client === true,
    occurredAt: occurred.toISOString(),
  }
}

const REASON_BY_KIND: Record<PortalEventKind, PortalNotificationReason> = {
  message: 'unread_chatter',
  status: 'status_change',
  new_record: 'new_tramite',
  new_firma: 'new_firma',
}

/** Un evento como el aviso que ya sabe convertir en push (`buildPushPayload`). */
export function eventToNotification(event: PortalEventRow): PortalNotification {
  return {
    scope: event.scope,
    recordId: event.recordId,
    name: event.recordName,
    reason: REASON_BY_KIND[event.kind],
    latestDate: event.occurredAt,
    listKind:
      event.scope === 'tramite' || event.scope === 'consulta' ? event.scope : undefined,
    latestMessageId: event.messageId ?? undefined,
    previousStateLabel: event.previousStateLabel ?? undefined,
    newStateLabel: event.stateLabel ?? undefined,
  }
}

/**
 * Varios cambios del mismo tipo en el mismo registro son un solo aviso (el más
 * reciente): 5 mensajes seguidos en un trámite no son 5 notificaciones.
 */
export function collapseEvents(events: PortalEventRow[]): PortalEventRow[] {
  const latest = new Map<string, PortalEventRow>()
  for (const event of [...events].sort((a, b) => a.seq - b.seq)) {
    latest.set(`${event.kind}:${event.scope}:${event.recordId}`, event)
  }
  return [...latest.values()].sort((a, b) => a.seq - b.seq)
}

/** Extractos por id de mensaje, para el cuerpo del push de un aviso suelto. */
export function previewsFromEvents(events: PortalEventRow[]): Map<number, string> {
  const previews = new Map<number, string>()
  for (const event of events) {
    if (event.messageId !== null && event.excerpt) previews.set(event.messageId, event.excerpt)
  }
  return previews
}
