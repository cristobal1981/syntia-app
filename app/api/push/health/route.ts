import { NextResponse } from 'next/server'

import { hasBearerSecret } from '@/lib/security/bearer-secret'
import { evaluatePushHealth } from '@/src/modules/push/domain/push-health'
import { resolvePushSource } from '@/src/modules/push/domain/push-source'
import { loadPushHealthInput } from '@/src/modules/push/infrastructure/push-health.supabase'

const NO_STORE = { 'Cache-Control': 'no-store' }

/**
 * Salud del envío de push para un monitor externo (UptimeRobot, n8n…): 200 si
 * todo va bien o solo hay avisos, 503 si hay algún error (pulso parado,
 * ejecuciones fallando, cerrojo atascado). Mismo secreto que el dispatcher.
 */
export async function GET(request: Request) {
  if (!hasBearerSecret(request, 'PUSH_DISPATCH_SECRET', 'push health')) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401, headers: NO_STORE })
  }

  try {
    const now = Date.now()
    const source = resolvePushSource(process.env.PUSH_SOURCE)
    const health = evaluatePushHealth(await loadPushHealthInput(source, now))

    return NextResponse.json(
      { ok: health.ok, source, problems: health.problems, checkedAt: new Date(now).toISOString() },
      { status: health.ok ? 200 : 503, headers: NO_STORE }
    )
  } catch (error) {
    console.error('[push health] falló', error)
    return NextResponse.json({ ok: false, error: 'failed' }, { status: 500, headers: NO_STORE })
  }
}
