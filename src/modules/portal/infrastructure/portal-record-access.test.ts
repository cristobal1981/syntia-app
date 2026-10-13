import { describe, expect, it, vi, beforeEach } from 'vitest'

import { resolveTaskWorkerSection } from '@/src/modules/portal/infrastructure/portal-record-access'

const { getCachedTramitesSnapshot, getCachedObligacionTaskIndex } = vi.hoisted(() => ({
  getCachedTramitesSnapshot: vi.fn(),
  getCachedObligacionTaskIndex: vi.fn(),
}))

vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  getCachedTramitesSnapshot,
  getCachedObligacionTaskIndex,
}))

const PARTNER_ID = 42

beforeEach(() => {
  vi.clearAllMocks()
})

describe('resolveTaskWorkerSection', () => {
  it('resolves a task that is in the tramites snapshot to /tramites', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [{ id: 101 }], tickets: [] })
    getCachedObligacionTaskIndex.mockResolvedValue({ leaves: [] })

    const section = await resolveTaskWorkerSection(101, PARTNER_ID)

    expect(section).toBe('/tramites')
  })

  it('resolves a task that is only in the obligación task index to /obligaciones', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [], tickets: [] })
    getCachedObligacionTaskIndex.mockResolvedValue({ leaves: [{ id: 202 }] })

    const section = await resolveTaskWorkerSection(202, PARTNER_ID)

    expect(section).toBe('/obligaciones')
  })

  it('returns null for a task id that belongs to neither snapshot (e.g. another company entirely)', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [{ id: 101 }], tickets: [] })
    getCachedObligacionTaskIndex.mockResolvedValue({ leaves: [{ id: 202 }] })

    const section = await resolveTaskWorkerSection(999, PARTNER_ID)

    expect(section).toBeNull()
  })

  it('prefers /tramites when a task id somehow appears in both snapshots (defensive: should never actually happen)', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [{ id: 303 }], tickets: [] })
    getCachedObligacionTaskIndex.mockResolvedValue({ leaves: [{ id: 303 }] })

    const section = await resolveTaskWorkerSection(303, PARTNER_ID)

    expect(section).toBe('/tramites')
  })

  it('queries both snapshots for the given partner, not a hardcoded one', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [], tickets: [] })
    getCachedObligacionTaskIndex.mockResolvedValue({ leaves: [] })

    await resolveTaskWorkerSection(1, 777)

    expect(getCachedTramitesSnapshot).toHaveBeenCalledWith(777)
    expect(getCachedObligacionTaskIndex).toHaveBeenCalledWith(777)
  })
})
