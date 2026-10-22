import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import type { PushHealthInput, PushHealthRun } from '@/src/modules/push/domain/push-health'

const DISPATCH_RUNS_LIMIT = 20
const SWEEP_RUNS_LIMIT = 5

type RunRow = {
  source: 'events' | 'snapshots' | 'sweep'
  started_at: string
  error: string | null
  locked: boolean
  truncated: boolean
  sent: number
}

function toRun(row: RunRow): PushHealthRun {
  return {
    source: row.source,
    startedAt: Date.parse(row.started_at),
    hadError: row.error !== null,
    locked: row.locked,
    truncated: row.truncated,
    // En un barrido, `sent` son los eventos que ha recuperado.
    created: row.source === 'sweep' ? row.sent : 0,
  }
}

/** Lo que hace falta para evaluar la salud del envío de push. */
export async function loadPushHealthInput(
  source: PushHealthInput['source'],
  now: number
): Promise<PushHealthInput> {
  const supabase = createSupabaseAdminClient()
  const columns = 'source, started_at, error, locked, truncated, sent'

  const [dispatches, sweeps, lastEvent] = await Promise.all([
    supabase
      .from('push_runs')
      .select(columns)
      .in('source', ['events', 'snapshots'])
      .order('started_at', { ascending: false })
      .limit(DISPATCH_RUNS_LIMIT),
    supabase
      .from('push_runs')
      .select(columns)
      .eq('source', 'sweep')
      .order('started_at', { ascending: false })
      .limit(SWEEP_RUNS_LIMIT),
    supabase
      .from('portal_events')
      .select('received_at')
      .order('received_at', { ascending: false })
      .limit(1),
  ])

  for (const result of [dispatches, sweeps, lastEvent]) {
    if (result.error) throw new Error(result.error.message)
  }

  const received = (lastEvent.data?.[0] as { received_at: string } | undefined)?.received_at

  return {
    now,
    source,
    runs: [
      ...((dispatches.data ?? []) as RunRow[]),
      ...((sweeps.data ?? []) as RunRow[]),
    ]
      .map(toRun)
      .sort((a, b) => b.startedAt - a.startedAt),
    lastEventAt: received ? Date.parse(received) : null,
  }
}
