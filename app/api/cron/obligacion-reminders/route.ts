import { NextResponse } from 'next/server'

import { timingSafeEqualStrings } from '@/lib/security/timing-safe-equal'
import { runObligacionReminders } from '@/src/modules/obligaciones/application/run-obligacion-reminders'

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    console.error('[cron obligacion-reminders] CRON_SECRET missing.')
    return false
  }

  const header = request.headers.get('authorization') ?? ''
  const expected = `Bearer ${secret}`
  return timingSafeEqualStrings(header, expected)
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // `?slot=` fuerza la franja en una prueba manual; el cron nunca lo manda y
  // decide por la hora local de Canarias.
  const slotParam = new URL(request.url).searchParams.get('slot')
  const slot =
    slotParam === 'morning' || slotParam === 'presentation' ? slotParam : undefined

  const summary = await runObligacionReminders({ slot })
  return NextResponse.json({ ok: true, ...summary })
}
