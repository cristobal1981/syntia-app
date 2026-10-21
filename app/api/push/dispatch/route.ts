import { NextResponse } from 'next/server'

import { timingSafeEqualStrings } from '@/lib/security/timing-safe-equal'
import { dispatchPushNotifications } from '@/src/modules/push/application/dispatch-push-notifications'
import { isWebPushConfigured } from '@/src/modules/push/infrastructure/web-push-sender'

// Margen sobre los 45 s de trabajo de `dispatchPushNotifications`.
export const maxDuration = 60

function isAuthorized(request: Request): boolean {
  const secret = process.env.PUSH_DISPATCH_SECRET?.trim()
  if (!secret) {
    console.error('[push dispatch] PUSH_DISPATCH_SECRET missing.')
    return false
  }

  const header = request.headers.get('authorization') ?? ''
  return timingSafeEqualStrings(header, `Bearer ${secret}`)
}

/** Lo llama n8n cada pocos minutos: manda los push pendientes de cada dispositivo. */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  if (!isWebPushConfigured()) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }

  try {
    const summary = await dispatchPushNotifications()
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    console.error('[push dispatch] falló', error)
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 500 })
  }
}
