import { NextResponse } from 'next/server'

import { timingSafeEqualStrings } from '@/lib/security/timing-safe-equal'
import { parsePortalEventInput } from '@/src/modules/push/domain/portal-event'
import { insertPortalEvent } from '@/src/modules/push/infrastructure/portal-events.supabase'

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
 * (mensaje, estado, tarea o firma nueva). Guarda el evento; el dispatcher de
 * push lo envía después, sin volver a consultar Odoo. Idempotente por
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

  const event = parsePortalEventInput(json)
  if (!event) {
    return NextResponse.json({ ok: false, error: 'invalid_event' }, { status: 422 })
  }

  try {
    const status = await insertPortalEvent(event)
    return NextResponse.json({ ok: true, status })
  } catch (error) {
    console.error('[odoo events] guardar falló', { eventId: event.eventId, error })
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 500 })
  }
}
