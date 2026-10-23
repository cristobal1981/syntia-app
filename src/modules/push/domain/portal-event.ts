import type {
  PortalNotification,
  PortalNotificationReason,
  PortalRecordScope,
} from '@/src/modules/portal/domain/portal-notifications-types'
import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'
import { formatObligacionPeriodLabel } from '@/src/modules/obligaciones/domain/format-obligacion-period-label'
import { mapTaskStateLabel } from '@/src/modules/tramites/domain/map-task-state'
import { htmlToPushPreview } from '@/src/modules/push/domain/push-text'

export type PortalEventKind =
  | 'message'
  | 'status'
  | 'new_record'
  | 'new_firma'
  | 'firma_due_soon'

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

const KINDS: ReadonlySet<string> = new Set([
  'message',
  'status',
  'new_record',
  'new_firma',
  'firma_due_soon',
])

const MODEL_TASK = 'project.task'
const MODEL_TICKET = 'helpdesk.ticket'
const MODEL_SIGN = 'sign.request'

const MAX_EVENT_ID_LENGTH = 200
const MAX_NAME_LENGTH = 200
const MAX_STATE_LENGTH = 60
const MAX_ANCESTORS = 10
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

export type ParsedPortalEvent =
  | { status: 'ok'; event: PortalEventInput }
  /** Válido pero no debe avisar (p. ej. un periodo de obligaciones o una tarea creada en bloque). */
  | { status: 'ignored' }
  | { status: 'invalid' }

const INVALID: ParsedPortalEvent = { status: 'invalid' }
const IGNORED: ParsedPortalEvent = { status: 'ignored' }

/**
 * Valida el cuerpo que manda la acción automatizada de Odoo y lo traduce a lo
 * que ve el cliente. Odoo manda hechos en bruto (modelo, nombre, estado, nombres
 * de los ancestros de la tarea) y es el portal quien decide el ámbito, el título
 * y la etiqueta del estado con las mismas reglas que ya usa para mostrarlos.
 *
 * - `project.task`: trámite; si su raíz empieza por `obligacionesPrefix` es una
 *   obligación (solo cuentan las hojas, raíz > periodo > hoja, y no avisan de
 *   altas: se crean en bloque cada año).
 * - `helpdesk.ticket`: consulta (mensaje o alta).
 * - `sign.request`: firma nueva.
 *
 * El HTML del mensaje (`message_body`) se sanea y se reduce a un extracto: lo
 * demás no se guarda.
 */
export function parsePortalEventPayload(
  input: unknown,
  options: { obligacionesPrefix: string }
): ParsedPortalEvent {
  if (typeof input !== 'object' || input === null) return INVALID
  const raw = input as Record<string, unknown>

  const eventId = boundedText(raw.event_id, MAX_EVENT_ID_LENGTH)
  const partnerId = positiveInteger(raw.partner_id)
  const recordId = positiveInteger(raw.record_id)
  const recordName = boundedText(raw.record_name, MAX_NAME_LENGTH)
  if (!eventId || !partnerId || !recordId || !recordName) return INVALID

  if (typeof raw.kind !== 'string' || !KINDS.has(raw.kind)) return INVALID
  const kind = raw.kind as PortalEventKind

  const model = raw.model === undefined ? MODEL_TASK : raw.model
  if (model !== MODEL_TASK && model !== MODEL_TICKET && model !== MODEL_SIGN) return INVALID
  // Una firma solo genera «nueva firma» o «vence pronto»; el resto de tipos son de tareas y tickets.
  if ((kind === 'new_firma' || kind === 'firma_due_soon') !== (model === MODEL_SIGN)) {
    return INVALID
  }

  const messageId =
    raw.message_id === undefined || raw.message_id === null
      ? null
      : positiveInteger(raw.message_id)
  if (raw.message_id !== undefined && raw.message_id !== null && messageId === null) {
    return INVALID
  }
  if (kind === 'message' && messageId === null) return INVALID

  if (typeof raw.occurred_at !== 'string') return INVALID
  const occurred = new Date(raw.occurred_at)
  if (Number.isNaN(occurred.getTime())) return INVALID

  if (raw.by_client !== undefined && typeof raw.by_client !== 'boolean') return INVALID

  let ancestors: string[] = []
  if (raw.ancestor_names !== undefined) {
    if (!Array.isArray(raw.ancestor_names) || raw.ancestor_names.length > MAX_ANCESTORS) {
      return INVALID
    }
    const names = raw.ancestor_names.map((name) => boundedText(name, MAX_NAME_LENGTH))
    if (names.some((name) => name === null)) return INVALID
    ancestors = names as string[]
  }

  let scope: PortalRecordScope
  let title = recordName
  let stateLabel: string | null = null
  let previousStateLabel: string | null = null

  if (model === MODEL_SIGN) {
    scope = 'firma'
  } else if (model === MODEL_TICKET) {
    scope = 'consulta'
    // Los tickets avisan de mensajes y altas; su estado no se publica.
    if (kind === 'status') return IGNORED
  } else if (
    ancestors[0]?.startsWith(options.obligacionesPrefix) ||
    (ancestors.length === 0 && recordName.startsWith(options.obligacionesPrefix))
  ) {
    scope = 'obligacion'
    if (kind === 'new_record') return IGNORED
    // Raíz y periodos no avisan: solo la hoja raíz > periodo > hoja.
    if (ancestors.length !== 2) return IGNORED
    const modelLabel = formatObligacionModelLabel(recordName)
    const periodLabel = formatObligacionPeriodLabel(ancestors[1]!, recordName).label
    title = periodLabel ? `${modelLabel} · ${periodLabel}` : modelLabel
  } else {
    scope = 'tramite'
  }

  if (kind === 'status') {
    const state = boundedText(raw.state, MAX_STATE_LENGTH)
    stateLabel = state ? (mapTaskStateLabel(state) ?? null) : null
    if (!stateLabel) return INVALID
    const previous = boundedText(raw.previous_state, MAX_STATE_LENGTH)
    previousStateLabel = previous ? (mapTaskStateLabel(previous) ?? null) : null
    // Mismo estado visible antes y después (p. ej. 03_approved y 01_in_progress): no es un cambio.
    if (previousStateLabel === stateLabel) return IGNORED
  }

  const body =
    typeof raw.message_body === 'string' ? raw.message_body.slice(0, MAX_BODY_LENGTH) : null

  return {
    status: 'ok',
    event: {
      eventId,
      partnerId,
      kind,
      scope,
      recordId,
      recordName: title,
      stateLabel,
      previousStateLabel,
      messageId,
      excerpt: kind === 'message' ? htmlToPushPreview(body) : null,
      byClient: raw.by_client === true,
      occurredAt: occurred.toISOString(),
    },
  }
}

/**
 * Un cambio de estado sin estado anterior (Odoo no lo manda en todas las
 * versiones) se completa con el último estado visible que ya conocemos de ese
 * registro; si es el mismo que el nuevo, no hay cambio que avisar (`null`).
 */
export function resolveStatusChange(
  event: PortalEventInput,
  lastKnownLabel: string | null
): PortalEventInput | null {
  if (event.kind !== 'status' || !lastKnownLabel) return event
  if (lastKnownLabel === event.stateLabel) return null
  return event.previousStateLabel === null
    ? { ...event, previousStateLabel: lastKnownLabel }
    : event
}

const REASON_BY_KIND: Record<PortalEventKind, PortalNotificationReason> = {
  message: 'unread_chatter',
  status: 'status_change',
  new_record: 'new_tramite',
  new_firma: 'new_firma',
  firma_due_soon: 'firma_due_soon',
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
