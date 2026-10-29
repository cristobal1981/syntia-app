import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import type { PushHealthInput, PushHealthRun } from '@/src/modules/push/domain/push-health'

const DISPATCH_RUNS_LIMIT = 20
const SWEEP_RUNS_LIMIT = 5
const SUBSCRIPTIONS_LIMIT = 1000
/** `EVENT_MAX_AGE_MS` del dispatcher: pasado este plazo un evento ya no se envía. */
const EVENT_MAX_AGE_MS = 3_600_000

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

  const [dispatches, sweeps, lastEvent, subscriptions] = await Promise.all([
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
    supabase.from('push_subscriptions').select('last_event_seq, updated_at').limit(SUBSCRIPTIONS_LIMIT),
  ])

  for (const result of [dispatches, sweeps, lastEvent, subscriptions]) {
    if (result.error) throw new Error(result.error.message)
  }

  const cursors = (subscriptions.data ?? []) as { last_event_seq: number | null; updated_at: string }[]
  const set = cursors.flatMap((row) => (row.last_event_seq === null ? [] : [Number(row.last_event_seq)]))
  const unsetSince = cursors
    .filter((row) => row.last_event_seq === null)
    .map((row) => Date.parse(row.updated_at))
  const minCursor = set.length > 0 ? Math.min(...set) : null

  let oldestPendingEventAt: number | null = null
  if (minCursor !== null) {
    const pending = await supabase
      .from('portal_events')
      .select('received_at')
      .gt('seq', minCursor)
      .gte('received_at', new Date(now - EVENT_MAX_AGE_MS).toISOString())
      .order('received_at', { ascending: true })
      .limit(1)
    if (pending.error) throw new Error(pending.error.message)
    const received = (pending.data?.[0] as { received_at: string } | undefined)?.received_at
    oldestPendingEventAt = received ? Date.parse(received) : null
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
    oldestPendingEventAt,
    unsetCursorSince: unsetSince.length > 0 ? Math.min(...unsetSince) : null,
  }
}
