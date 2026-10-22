import { NextResponse } from 'next/server'

import { hasBearerSecret } from '@/lib/security/bearer-secret'
import {
  dispatchPushEvents,
  dispatchPushNotifications,
} from '@/src/modules/push/application/dispatch-push-notifications'
import { resolvePushSource } from '@/src/modules/push/domain/push-source'
import { recordPushRun } from '@/src/modules/push/infrastructure/push-runs.supabase'
import { isWebPushConfigured } from '@/src/modules/push/infrastructure/web-push-sender'

// Margen sobre los 45 s de trabajo de `dispatchPushNotifications`.
export const maxDuration = 60

/**
 * Lo llama un pulso periódico (pg_cron + pg_net, o n8n): manda los push
 * pendientes de cada dispositivo, desde los eventos de Odoo (`PUSH_SOURCE=events`)
 * o desde el cálculo por snapshots (por defecto).
 */
export async function POST(request: Request) {
  if (!hasBearerSecret(request, 'PUSH_DISPATCH_SECRET', 'push dispatch')) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }

  const source = resolvePushSource(process.env.PUSH_SOURCE)
  const startedAt = new Date()

  try {
    const summary =
      source === 'events' ? await dispatchPushEvents() : await dispatchPushNotifications()
    await recordPushRun({ source, startedAt, summary })
    return NextResponse.json({ ok: true, source, ...summary })
  } catch (error) {
    console.error('[push dispatch] falló', error)
    await recordPushRun({
      source,
      startedAt,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 500 })
  }
}
