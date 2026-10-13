import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  countActiveAutomationsForNav,
  countVisibleAutomationsForAdvisor,
  deletePortalAutomation,
  fetchUserAutomationOrderMap,
  getNextAutomationSortOrder,
  getPortalAutomationById,
  insertPortalAutomation,
  insertPortalAutomationRun,
  listPortalAutomationRuns,
  listPortalAutomationsFromDb,
  listPortalAutomationsWithLastRun,
  replaceUserAutomationOrder,
  updateAutomationGlobalOrder,
  updatePortalAutomationAccess,
  updatePortalAutomationDefinition,
} from '@/src/modules/automatizaciones/infrastructure/automation-repository.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

vi.mock('@/src/modules/automatizaciones/domain/types', async () => {
  const actual = await vi.importActual<
    typeof import('@/src/modules/automatizaciones/domain/types')
  >('@/src/modules/automatizaciones/domain/types')
  return {
    ...actual,
    parseAutomationInputFields: vi.fn(() => []),
  }
})

type QueryResult = {
  data?: unknown
  error?: { message: string } | null
  count?: number | null
}

function chainFor(result: QueryResult) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.delete = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.in = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.single = () => resolved
  chain.maybeSingle = () => resolved
  chain.then = (resolve: (v: QueryResult) => void, reject: (e: unknown) => void) =>
    resolved.then(resolve, reject)
  return chain
}

function automationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'auto-1',
    slug: 'facturas',
    title: 'Facturas',
    description: null,
    webhook_path: '/hooks/facturas',
    icon: 'file',
    sort_order: 0,
    is_active: true,
    visibility: 'all',
    input_fields: [],
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listPortalAutomationsFromDb', () => {
  it('attaches granted advisor ids per automation from the grants table', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'portal_automations') {
        return chainFor({ data: [automationRow(), automationRow({ id: 'auto-2' })], error: null })
      }
      if (table === 'portal_automation_advisor_grants') {
        return chainFor({
          data: [
            { automation_id: 'auto-1', advisor_id: 'adv-1' },
            { automation_id: 'auto-1', advisor_id: 'adv-2' },
          ],
          error: null,
        })
      }
      throw new Error(`unexpected table ${table}`)
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    const result = await listPortalAutomationsFromDb()

    expect(result[0].grantedAdvisorIds).toEqual(['adv-1', 'adv-2'])
    expect(result[1].grantedAdvisorIds).toEqual([])
  })

  it('never queries the grants table when there are zero automations', async () => {
    const grantsFrom = vi.fn()
    const from = vi.fn((table: string) => {
      if (table === 'portal_automations') return chainFor({ data: [], error: null })
      grantsFrom(table)
      return chainFor({ data: [], error: null })
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    await listPortalAutomationsFromDb()

    expect(grantsFrom).not.toHaveBeenCalled()
  })

  it('throws on a list error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'list failed' } }),
    })

    await expect(listPortalAutomationsFromDb()).rejects.toThrow('list failed')
  })
})

describe('listPortalAutomationsWithLastRun', () => {
  it('DEDUP: keeps only the most-recent run per automation (rows arrive ordered desc; first-seen wins)', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'portal_automations') return chainFor({ data: [automationRow()], error: null })
      if (table === 'portal_automation_advisor_grants') return chainFor({ data: [], error: null })
      if (table === 'portal_automation_runs') {
        return chainFor({
          data: [
            { automation_id: 'auto-1', status: 'sent', http_status: 200, created_at: '2024-02-01' },
            { automation_id: 'auto-1', status: 'failed', http_status: 500, created_at: '2024-01-01' },
          ],
          error: null,
        })
      }
      throw new Error(`unexpected table ${table}`)
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    const result = await listPortalAutomationsWithLastRun()

    expect(result[0].lastRun).toEqual({
      status: 'sent',
      httpStatus: 200,
      createdAt: '2024-02-01',
    })
  })

  it('lastRun is null when the automation has no runs', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'portal_automations') return chainFor({ data: [automationRow()], error: null })
      if (table === 'portal_automation_advisor_grants') return chainFor({ data: [], error: null })
      if (table === 'portal_automation_runs') return chainFor({ data: [], error: null })
      throw new Error(`unexpected table ${table}`)
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    const result = await listPortalAutomationsWithLastRun()

    expect(result[0].lastRun).toBeNull()
  })
})

describe('getPortalAutomationById', () => {
  it('returns null when not found, without querying grants', async () => {
    const grantsFrom = vi.fn()
    const from = vi.fn((table: string) => {
      if (table === 'portal_automations') return chainFor({ data: null, error: null })
      grantsFrom(table)
      return chainFor({ data: [], error: null })
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    expect(await getPortalAutomationById('auto-1')).toBeNull()
    expect(grantsFrom).not.toHaveBeenCalled()
  })
})

describe('updatePortalAutomationAccess', () => {
  it('ALWAYS clears existing grants first, then re-inserts only when visibility is "selected" AND the list is non-empty', async () => {
    const insertChain = chainFor({ error: null })
    const deleteChain = chainFor({ error: null })
    const updateChain = chainFor({ error: null })
    const from = vi.fn((table: string) => {
      if (table === 'portal_automations') return updateChain
      if (table === 'portal_automation_advisor_grants') {
        // first call in this function is delete, second (if any) is insert
        return (from as ReturnType<typeof vi.fn>).mock.calls.filter(
          (c) => c[0] === 'portal_automation_advisor_grants'
        ).length === 1
          ? deleteChain
          : insertChain
      }
      throw new Error(`unexpected table ${table}`)
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    await updatePortalAutomationAccess({
      automationId: 'auto-1',
      isActive: true,
      visibility: 'selected',
      grantedAdvisorIds: ['adv-1', 'adv-2'],
    })

    expect(deleteChain.delete).toHaveBeenCalled()
    expect(insertChain.insert).toHaveBeenCalledWith([
      { automation_id: 'auto-1', advisor_id: 'adv-1' },
      { automation_id: 'auto-1', advisor_id: 'adv-2' },
    ])
  })

  it('does NOT re-insert when visibility is not "selected", even with a non-empty advisor list', async () => {
    const deleteChain = chainFor({ error: null })
    const insertSpy = vi.fn()
    const from = vi.fn((table: string) => {
      if (table === 'portal_automations') return chainFor({ error: null })
      if (table === 'portal_automation_advisor_grants') {
        insertSpy()
        return deleteChain
      }
      throw new Error(`unexpected table ${table}`)
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    await updatePortalAutomationAccess({
      automationId: 'auto-1',
      isActive: true,
      visibility: 'all',
      grantedAdvisorIds: ['adv-1'],
    })

    expect(deleteChain.insert).not.toHaveBeenCalled()
  })

  it('does NOT re-insert when the advisor list is empty, even with visibility "selected"', async () => {
    const deleteChain = chainFor({ error: null })
    const from = vi.fn((table: string) => {
      if (table === 'portal_automations') return chainFor({ error: null })
      return deleteChain
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    await updatePortalAutomationAccess({
      automationId: 'auto-1',
      isActive: true,
      visibility: 'selected',
      grantedAdvisorIds: [],
    })

    expect(deleteChain.insert).not.toHaveBeenCalled()
  })

  it('throws on the update error and never touches grants', async () => {
    const from = vi.fn(() => chainFor({ error: { message: 'update failed' } }))
    createSupabaseAdminClient.mockReturnValue({ from })

    await expect(
      updatePortalAutomationAccess({
        automationId: 'auto-1',
        isActive: true,
        visibility: 'all',
        grantedAdvisorIds: [],
      })
    ).rejects.toThrow('update failed')
    expect(from).toHaveBeenCalledTimes(1)
  })
})

describe('updatePortalAutomationDefinition (DIFFERENT semantics from updatePortalAutomationAccess)', () => {
  it('does NOT touch grants when visibility stays/becomes "selected"', async () => {
    const grantsFrom = vi.fn()
    const from = vi.fn((table: string) => {
      if (table === 'portal_automations') return chainFor({ error: null })
      grantsFrom(table)
      return chainFor({ error: null })
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    await updatePortalAutomationDefinition({
      automationId: 'auto-1',
      slug: 'facturas',
      title: 'Facturas',
      description: null,
      webhookPath: '/hooks/facturas',
      icon: 'file',
      isActive: true,
      visibility: 'selected',
      inputFields: [],
    })

    expect(grantsFrom).not.toHaveBeenCalled()
  })

  it('clears grants when visibility is not "selected"', async () => {
    const grantsChain = chainFor({ error: null })
    const from = vi.fn((table: string) => {
      if (table === 'portal_automations') return chainFor({ error: null })
      if (table === 'portal_automation_advisor_grants') return grantsChain
      throw new Error(`unexpected table ${table}`)
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    await updatePortalAutomationDefinition({
      automationId: 'auto-1',
      slug: 'facturas',
      title: 'Facturas',
      description: null,
      webhookPath: '/hooks/facturas',
      icon: 'file',
      isActive: true,
      visibility: 'all',
      inputFields: [],
    })

    expect(grantsChain.delete).toHaveBeenCalled()
    expect(grantsChain.eq).toHaveBeenCalledWith('automation_id', 'auto-1')
  })
})

describe('insertPortalAutomationRun / listPortalAutomationRuns', () => {
  it('insertPortalAutomationRun defaults httpStatus/errorMessage to null when omitted', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await insertPortalAutomationRun({
      automationId: 'auto-1',
      triggeredBy: 'user-1',
      status: 'sent',
    })

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ http_status: null, error_message: null })
    )
  })

  it('listPortalAutomationRuns returns early and never queries automations/users/profiles when there are zero runs', async () => {
    const from = vi.fn(() => chainFor({ data: [], error: null }))
    createSupabaseAdminClient.mockReturnValue({ from })

    const result = await listPortalAutomationRuns({})

    expect(result).toEqual([])
    expect(from).toHaveBeenCalledTimes(1)
  })

  it('resolves triggeredByName from the profile first, falling back to the trimmed email, and falls back to the raw automation id/generic title when the automation was deleted', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'portal_automation_runs') {
        return chainFor({
          data: [
            {
              id: 'run-1',
              automation_id: 'auto-missing',
              triggered_by: 'user-1',
              status: 'sent',
              http_status: 200,
              error_message: null,
              created_at: '2024-01-01',
            },
          ],
          error: null,
        })
      }
      if (table === 'portal_automations') return chainFor({ data: [], error: null })
      if (table === 'portal_automation_advisor_grants') return chainFor({ data: [], error: null })
      if (table === 'users') {
        return chainFor({ data: [{ id: 'user-1', email: '  a@x.com  ' }], error: null })
      }
      if (table === 'profiles') return chainFor({ data: [], error: null })
      throw new Error(`unexpected table ${table}`)
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    const [run] = await listPortalAutomationRuns({})

    expect(run.triggeredByName).toBe('a@x.com')
    expect(run.automationSlug).toBe('auto-missing')
    expect(run.automationTitle).toBe('Automatización')
  })

  it('scopes to triggeredBy when given', async () => {
    const chain = chainFor({ data: [], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await listPortalAutomationRuns({ triggeredBy: 'user-1' })

    expect(chain.eq).toHaveBeenCalledWith('triggered_by', 'user-1')
  })
})

describe('insertPortalAutomation / deletePortalAutomation / getNextAutomationSortOrder', () => {
  it('insertPortalAutomation returns the row with an empty grantedAdvisorIds (a brand new automation has no grants yet)', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: automationRow(), error: null }),
    })

    const result = await insertPortalAutomation({
      slug: 'nueva',
      title: 'Nueva',
      description: null,
      webhookPath: '/hooks/nueva',
      icon: 'file',
      sortOrder: 0,
      isActive: true,
      visibility: 'all',
      inputFields: [],
    })

    expect(result.grantedAdvisorIds).toEqual([])
  })

  it('deletePortalAutomation scopes the delete to the id', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await deletePortalAutomation('auto-1')

    expect(chain.eq).toHaveBeenCalledWith('id', 'auto-1')
  })

  it('getNextAutomationSortOrder returns 0 when there are no automations yet', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: null }),
    })

    expect(await getNextAutomationSortOrder()).toBe(0)
  })

  it('getNextAutomationSortOrder returns max + 1 otherwise', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: { sort_order: 4 }, error: null }),
    })

    expect(await getNextAutomationSortOrder()).toBe(5)
  })
})

describe('updateAutomationGlobalOrder', () => {
  it('writes sort_order = array index for each id, in order', async () => {
    const ids: unknown[] = []
    const sortOrders: unknown[] = []
    const from = vi.fn(() => {
      const chain = chainFor({ error: null })
      const originalEq = chain.eq as (col: string, val: unknown) => unknown
      chain.eq = vi.fn((col: string, val: unknown) => {
        if (col === 'id') ids.push(val)
        return originalEq(col, val)
      })
      const originalUpdate = chain.update as (payload: unknown) => unknown
      chain.update = vi.fn((payload: { sort_order: unknown }) => {
        sortOrders.push(payload.sort_order)
        return originalUpdate(payload)
      })
      return chain
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    await updateAutomationGlobalOrder(['auto-b', 'auto-a', 'auto-c'])

    expect(ids).toEqual(['auto-b', 'auto-a', 'auto-c'])
    expect(sortOrders).toEqual([0, 1, 2])
  })

  it('STOPS on the first error and does not attempt the remaining ids', async () => {
    let call = 0
    const from = vi.fn(() => {
      call += 1
      return chainFor(call === 1 ? { error: { message: 'boom' } } : { error: null })
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    await expect(updateAutomationGlobalOrder(['auto-a', 'auto-b'])).rejects.toThrow('boom')
    expect(from).toHaveBeenCalledTimes(1)
  })
})

describe('replaceUserAutomationOrder', () => {
  it('always deletes the prior order first, then inserts only if the new order is non-empty', async () => {
    const deleteChain = chainFor({ error: null })
    const from = vi.fn(() => deleteChain)
    createSupabaseAdminClient.mockReturnValue({ from })

    await replaceUserAutomationOrder('user-1', [])

    expect(deleteChain.delete).toHaveBeenCalled()
    expect(deleteChain.eq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(deleteChain.insert).not.toHaveBeenCalled()
  })

  it('inserts each id with its array-index position', async () => {
    const deleteChain = chainFor({ error: null })
    const insertChain = chainFor({ error: null })
    const from = vi.fn().mockReturnValueOnce(deleteChain).mockReturnValueOnce(insertChain)
    createSupabaseAdminClient.mockReturnValue({ from })

    await replaceUserAutomationOrder('user-1', ['auto-b', 'auto-a'])

    expect(insertChain.insert).toHaveBeenCalledWith([
      { user_id: 'user-1', automation_id: 'auto-b', position: 0 },
      { user_id: 'user-1', automation_id: 'auto-a', position: 1 },
    ])
  })
})

describe('fetchUserAutomationOrderMap / countActiveAutomationsForNav / countVisibleAutomationsForAdvisor', () => {
  it('fetchUserAutomationOrderMap builds an automationId -> position map', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () =>
        chainFor({
          data: [
            { automation_id: 'auto-a', position: 1 },
            { automation_id: 'auto-b', position: 0 },
          ],
          error: null,
        }),
    })

    const map = await fetchUserAutomationOrderMap('user-1')

    expect(map.get('auto-a')).toBe(1)
    expect(map.get('auto-b')).toBe(0)
  })

  it('countActiveAutomationsForNav only counts is_active = true, returns 0 for a null count', async () => {
    const chain = chainFor({ count: null, error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    expect(await countActiveAutomationsForNav()).toBe(0)
    expect(chain.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('countVisibleAutomationsForAdvisor excludes automations the advisor cannot see (visibility=selected without a grant)', async () => {
    const from = vi.fn((table: string) => {
      if (table === 'portal_automations') {
        return chainFor({
          data: [
            automationRow({ id: 'auto-visible', visibility: 'all' }),
            automationRow({ id: 'auto-hidden', visibility: 'selected' }),
          ],
          error: null,
        })
      }
      if (table === 'portal_automation_advisor_grants') return chainFor({ data: [], error: null })
      throw new Error(`unexpected table ${table}`)
    })
    createSupabaseAdminClient.mockReturnValue({ from })

    expect(await countVisibleAutomationsForAdvisor('adv-1')).toBe(1)
  })
})
