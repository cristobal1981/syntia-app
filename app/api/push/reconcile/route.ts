import { NextResponse } from 'next/server'

import { hasBearerSecret } from '@/lib/security/bearer-secret'
import { sweepPushMessages } from '@/src/modules/push/application/sweep-push-messages'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { recordPushRun } from '@/src/modules/push/infrastructure/push-runs.supabase'

// Cada página son pocas peticiones a Odoo; el margen cubre varias páginas con reintentos.
export const maxDuration = 60

/**
 * Lo llama un pulso periódico (cada 30 min): revisa los mensajes nuevos de Odoo
 * y crea el evento de los que no llegaron por el webhook. Mismo secreto que el
 * dispatcher.
 */
export async function POST(request: Request) {
  if (!hasBearerSecret(request, 'PUSH_DISPATCH_SECRET', 'push reconcile')) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  if (!isOdooApiConfigured()) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }

  const startedAt = new Date()
  try {
    const summary = await sweepPushMessages()
    await recordPushRun({
      source: 'sweep',
      startedAt,
      // En un barrido, `sent` son los eventos recuperados.
      summary: {
        users: 0,
        sent: summary.created,
        removed: 0,
        skipped: summary.skipped,
        truncated: summary.more,
        locked: false,
      },
    })
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    console.error('[push reconcile] falló', error)
    await recordPushRun({
      source: 'sweep',
      startedAt,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 500 })
  }
}
