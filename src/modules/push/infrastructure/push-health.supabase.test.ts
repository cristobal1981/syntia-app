import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseAdminClient } = vi.hoisted(() => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

import { loadPushHealthInput } from '@/src/modules/push/infrastructure/push-health.supabase'

type Result = { data?: unknown; error?: { message: string } | null }

/** Un cliente que responde según la tabla y los filtros usados. */
function useClient(results: { dispatches?: Result; sweeps?: Result; event?: Result }) {
  const calls: { table: string; ops: [string, unknown[]][] }[] = []

  const from = vi.fn((table: string) => {
    const call = { table, ops: [] as [string, unknown[]][] }
    calls.push(call)
    const chain: Record<string, unknown> = {}
    for (const name of ['select', 'in', 'eq', 'order']) {
      chain[name] = (...args: unknown[]) => {
        call.ops.push([name, args])
        return chain
      }
    }
    chain.limit = (...args: unknown[]) => {
      call.ops.push(['limit', args])
      const isSweep = call.ops.some(([op, a]) => op === 'eq' && a[1] === 'sweep')
      const pick = table === 'portal_events' ? results.event : isSweep ? results.sweeps : results.dispatches
      return Promise.resolve({ data: pick?.data ?? [], error: pick?.error ?? null })
    }
    return chain
  })

  createSupabaseAdminClient.mockReturnValue({ from })
  return { calls }
}

const NOW = Date.parse('2026-10-22T12:00:00Z')

beforeEach(() => vi.resetAllMocks())

describe('loadPushHealthInput', () => {
  it('pide ejecuciones del dispatcher, barridos y el último evento por separado', async () => {
    const { calls } = useClient({})
    await loadPushHealthInput('events', NOW)

    const runs = calls.filter((call) => call.table === 'push_runs')
    expect(runs).toHaveLength(2)
    expect(runs[0]!.ops).toContainEqual(['in', ['source', ['events', 'snapshots']]])
    expect(runs[0]!.ops).toContainEqual(['limit', [20]])
    expect(runs[1]!.ops).toContainEqual(['eq', ['source', 'sweep']])
    expect(runs[1]!.ops).toContainEqual(['limit', [5]])

    const events = calls.find((call) => call.table === 'portal_events')!
    expect(events.ops).toContainEqual(['order', ['received_at', { ascending: false }]])
    expect(events.ops).toContainEqual(['limit', [1]])
  })

  it('mapea las filas y las deja de más nueva a más antigua mezclando barridos', async () => {
    useClient({
      dispatches: {
        data: [
          { source: 'events', started_at: '2026-10-22T11:59:00Z', error: null, locked: false, truncated: true, sent: 3 },
          { source: 'events', started_at: '2026-10-22T11:50:00Z', error: 'boom', locked: true, truncated: false, sent: 0 },
        ],
      },
      sweeps: {
        data: [{ source: 'sweep', started_at: '2026-10-22T11:55:00Z', error: null, locked: false, truncated: false, sent: 4 }],
      },
      event: { data: [{ received_at: '2026-10-22T11:30:00Z' }] },
    })

    const input = await loadPushHealthInput('events', NOW)

    expect(input).toMatchObject({ now: NOW, source: 'events', lastEventAt: Date.parse('2026-10-22T11:30:00Z') })
    expect(input.runs).toEqual([
      { source: 'events', startedAt: Date.parse('2026-10-22T11:59:00Z'), hadError: false, locked: false, truncated: true, created: 0 },
      { source: 'sweep', startedAt: Date.parse('2026-10-22T11:55:00Z'), hadError: false, locked: false, truncated: false, created: 4 },
      { source: 'events', startedAt: Date.parse('2026-10-22T11:50:00Z'), hadError: true, locked: true, truncated: false, created: 0 },
    ])
  })

  it('solo un barrido cuenta lo enviado como eventos recuperados', async () => {
    useClient({
      dispatches: {
        data: [{ source: 'snapshots', started_at: '2026-10-22T11:59:00Z', error: null, locked: false, truncated: false, sent: 9 }],
      },
    })
    expect((await loadPushHealthInput('snapshots', NOW)).runs[0]!.created).toBe(0)
  })

  it('sin eventos el último evento es null', async () => {
    useClient({})
    expect((await loadPushHealthInput('events', NOW)).lastEventAt).toBeNull()
  })

  it.each([['dispatches'], ['sweeps'], ['event']] as const)(
    'propaga el error de BD en %s',
    async (which) => {
      useClient({ [which]: { error: { message: 'boom' } } })
      await expect(loadPushHealthInput('events', NOW)).rejects.toThrow('boom')
    }
  )
})
