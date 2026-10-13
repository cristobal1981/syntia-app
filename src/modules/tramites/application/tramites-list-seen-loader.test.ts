import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it, vi, beforeEach } from 'vitest'

import { ensureTramitesListSeenInitialized } from '@/src/modules/tramites/application/tramites-list-seen-loader'

const { fetchTramitesListSeenState, upsertTramitesListSeenState } = vi.hoisted(() => ({
  fetchTramitesListSeenState: vi.fn(),
  upsertTramitesListSeenState: vi.fn(),
}))

vi.mock('@/src/modules/tramites/infrastructure/tramites-list-seen-state.supabase', () => ({
  fetchTramitesListSeenState,
  upsertTramitesListSeenState,
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ensureTramitesListSeenInitialized', () => {
  it('returns the existing state untouched if already initialized (does not overwrite it)', async () => {
    const existing = { openItemKeys: ['a', 'b'], initialized: true }
    fetchTramitesListSeenState.mockResolvedValue(existing)

    const result = await ensureTramitesListSeenInitialized('actor-1', ['c'])

    expect(result).toBe(existing)
    expect(upsertTramitesListSeenState).not.toHaveBeenCalled()
  })

  it('bootstraps a fresh state when none exists yet', async () => {
    fetchTramitesListSeenState.mockResolvedValue(null)

    const result = await ensureTramitesListSeenInitialized('actor-1', ['x', 'x', 'y'])

    expect(result).toEqual({ openItemKeys: ['x', 'y'], initialized: true })
    expect(upsertTramitesListSeenState).toHaveBeenCalledWith('actor-1', ['x', 'y'])
  })

  it('this module is NOT a Server Action file (no "use server") — it must stay that way so an arbitrary actorId can never be RPC-invoked from the client', async () => {
    const filePath = path.join(import.meta.dirname, 'tramites-list-seen-loader.ts')
    const source = await readFile(filePath, 'utf8')

    expect(source.trimStart().startsWith("'use server'")).toBe(false)
  })
})
