import { after, NextResponse } from 'next/server'

import { timingSafeEqualStrings } from '@/lib/security/timing-safe-equal'
import { getObligacionesParentPrefix } from '@/src/modules/obligaciones/infrastructure/obligaciones-env'
import {
  parsePortalEventPayload,
  resolveStatusChange,
} from '@/src/modules/push/domain/portal-event'
import { runPushAfterEventInProduction } from '@/src/modules/push/application/dispatch-push-after-event'
import { insertPortalEventAndInvalidate } from '@/src/modules/push/application/insert-portal-event'
import { isPushFromWebhookEnabled } from '@/src/modules/push/domain/push-from-webhook'
import { getLastStatusLabel } from '@/src/modules/push/infrastructure/portal-events.supabase'

// Margen para el envío de push que se programa tras guardar el evento (`after()`).
export const maxDuration = 60

/** Un evento real pesa unos cientos de bytes; el cuerpo del mensaje es lo mayor. */
const MAX_BODY_BYTES = 100_000

function isAuthorized(request: Request): boolean {
  const secret = process.env.ODOO_EVENTS_SECRET?.trim()
  if (!secret) {
    console.error('[odoo events] ODOO_EVENTS_SECRET missing.')
    return false
  }

  const header = request.headers.get('authorization') ?? ''
  return timingSafeEqualStrings(header, `Bearer ${secret}`)
}

/**
 * Lo llama una acción automatizada de Odoo en cada cambio visible en Syntia
 * (mensaje, estado, tarea, ticket o firma nueva). Odoo manda hechos en bruto y
 * el portal decide ámbito, título y estado visible. Guarda el evento; el dispatcher de
 * push lo envía después (a los segundos desde aquí con `PUSH_FROM_WEBHOOK=1`, o en el siguiente
 * pulso de pg_cron), sin volver a consultar Odoo. Idempotente por
 * `event_id`: un reintento de Odoo responde 200 sin duplicar.
 *
 * 4xx = el cuerpo no vale (Odoo no debe reintentar); 5xx = no se pudo guardar.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const body = await request.text()
  if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'too_large' }, { status: 413 })
  }

  let json: unknown
  try {
    json = JSON.parse(body)
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const parsed = parsePortalEventPayload(json, {
    obligacionesPrefix: getObligacionesParentPrefix(),
  })
  if (parsed.status === 'invalid') {
    return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 422 })
  }
  // Válido pero sin aviso (periodos de obligaciones, altas en bloque…): Odoo no reintenta.
  if (parsed.status === 'ignored') {
    return NextResponse.json({ ok: true, status: 'ignored' })
  }

  try {
    const event =
      parsed.event.kind === 'status'
        ? resolveStatusChange(
            parsed.event,
            await getLastStatusLabel(parsed.event.scope, parsed.event.recordId)
          )
        : parsed.event
    // Mismo estado visible que el último que ya conocíamos: no hay cambio que avisar.
    if (!event) return NextResponse.json({ ok: true, status: 'ignored' })

    const status = await insertPortalEventAndInvalidate(event)
    // Evento nuevo: el push no espera al pulso de pg_cron (hasta un minuto), sale a los segundos.
    // Un duplicado no programa nada: su envío ya está programado o hecho.
    if (
      status === 'created' &&
      isPushFromWebhookEnabled({
        PUSH_FROM_WEBHOOK: process.env.PUSH_FROM_WEBHOOK,
        PUSH_SOURCE: process.env.PUSH_SOURCE,
      })
    ) {
      after(() => runPushAfterEventInProduction(event.partnerId))
    }
    return NextResponse.json({ ok: true, status })
  } catch (error) {
    console.error('[odoo events] guardar falló', { eventId: parsed.event.eventId, error })
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 500 })
  }
}
