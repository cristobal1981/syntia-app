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

  const summary = await runObligacionReminders()
  return NextResponse.json({ ok: true, ...summary })
}
