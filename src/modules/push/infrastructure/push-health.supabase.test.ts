import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseAdminClient } = vi.hoisted(() => ({ createSupabaseAdminClient: vi.fn() }))
vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

import { loadPushHealthInput } from '@/src/modules/push/infrastructure/push-health.supabase'

type Result = { data?: unknown; error?: { message: string } | null }

/** Un cliente que responde según la tabla y los filtros usados. */
function useClient(results: {
  dispatches?: Result
  sweeps?: Result
  event?: Result
  subscriptions?: Result
  pending?: Result
}) {
  const calls: { table: string; ops: [string, unknown[]][] }[] = []

  const from = vi.fn((table: string) => {
    const call = { table, ops: [] as [string, unknown[]][] }
    calls.push(call)
    const chain: Record<string, unknown> = {}
    for (const name of ['select', 'in', 'eq', 'gt', 'gte', 'order']) {
      chain[name] = (...args: unknown[]) => {
        call.ops.push([name, args])
        return chain
      }
    }
    chain.limit = (...args: unknown[]) => {
      call.ops.push(['limit', args])
      const isSweep = call.ops.some(([op, a]) => op === 'eq' && a[1] === 'sweep')
      const isPending = call.ops.some(([op]) => op === 'gt')
      const pick =
        table === 'push_subscriptions'
          ? results.subscriptions
          : table === 'portal_events'
            ? isPending
              ? results.pending
              : results.event
            : isSweep
              ? results.sweeps
              : results.dispatches
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

  it('mira el evento más antiguo posterior al cursor más atrasado y dentro del plazo de una hora', async () => {
    const { calls } = useClient({
      subscriptions: {
        data: [
          { last_event_seq: 40, updated_at: '2026-10-22T11:00:00Z' },
          { last_event_seq: 30, updated_at: '2026-10-22T11:00:00Z' },
          { last_event_seq: null, updated_at: '2026-10-22T11:40:00Z' },
          { last_event_seq: null, updated_at: '2026-10-22T11:20:00Z' },
        ],
      },
      pending: { data: [{ received_at: '2026-10-22T11:45:00Z' }] },
    })
    const input = await loadPushHealthInput('events', NOW)

    const pending = calls.find((call) => call.ops.some(([op]) => op === 'gt'))!
    expect(pending.ops).toContainEqual(['gt', ['seq', 30]])
    expect(pending.ops).toContainEqual(['gte', ['received_at', '2026-10-22T11:00:00.000Z']])
    expect(pending.ops).toContainEqual(['order', ['received_at', { ascending: true }]])
    expect(input.oldestPendingEventAt).toBe(Date.parse('2026-10-22T11:45:00Z'))
    expect(input.unsetCursorSince).toBe(Date.parse('2026-10-22T11:20:00Z'))
  })

  it('sin dispositivos con cursor no pregunta por eventos pendientes', async () => {
    const { calls } = useClient({
      subscriptions: { data: [{ last_event_seq: null, updated_at: '2026-10-22T11:20:00Z' }] },
    })
    const input = await loadPushHealthInput('events', NOW)

    expect(calls.some((call) => call.ops.some(([op]) => op === 'gt'))).toBe(false)
    expect(input.oldestPendingEventAt).toBeNull()
  })

  it('sin dispositivos no hay cursor sin colocar', async () => {
    useClient({})
    expect((await loadPushHealthInput('events', NOW)).unsetCursorSince).toBeNull()
  })

  it.each([['dispatches'], ['sweeps'], ['event'], ['subscriptions'], ['pending']] as const)(
    'propaga el error de BD en %s',
    async (which) => {
      // Sin un dispositivo con cursor no se pregunta por pendientes.
      useClient({
        subscriptions: { data: [{ last_event_seq: 1, updated_at: '2026-10-22T11:00:00Z' }] },
        [which]: { error: { message: 'boom' } },
      })
      await expect(loadPushHealthInput('events', NOW)).rejects.toThrow('boom')
    }
  )
})
