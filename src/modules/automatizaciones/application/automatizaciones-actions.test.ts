import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import type {
  PortalAutomation,
  PortalAutomationListItem,
} from '@/src/modules/automatizaciones/domain/types'
import {
  createAutomationAction,
  deleteAutomationAction,
  listAutomatizacionesAction,
  listAutomationRunsAction,
  listAutomationsForAccessAdminAction,
  listOdooCompaniesForAutomationAction,
  reorderAutomationsAction,
  triggerAutomationAction,
  updateAutomationAccessAction,
  updateAutomationAction,
  type CreateAutomationInput,
} from '@/src/modules/automatizaciones/application/automatizaciones-actions'

const {
  getSession,
  resolveDirectoryActorId,
  listOdooCompaniesForAutomation,
  isAutomatizacionesConfigured,
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
  triggerAutomationWebhook,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
  listOdooCompaniesForAutomation: vi.fn(),
  isAutomatizacionesConfigured: vi.fn(),
  deletePortalAutomation: vi.fn(),
  fetchUserAutomationOrderMap: vi.fn(),
  getNextAutomationSortOrder: vi.fn(),
  getPortalAutomationById: vi.fn(),
  insertPortalAutomation: vi.fn(),
  insertPortalAutomationRun: vi.fn(),
  listPortalAutomationRuns: vi.fn(),
  listPortalAutomationsFromDb: vi.fn(),
  listPortalAutomationsWithLastRun: vi.fn(),
  replaceUserAutomationOrder: vi.fn(),
  updateAutomationGlobalOrder: vi.fn(),
  updatePortalAutomationAccess: vi.fn(),
  updatePortalAutomationDefinition: vi.fn(),
  triggerAutomationWebhook: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))
vi.mock('@/src/modules/automatizaciones/application/list-odoo-companies-for-automation', () => ({
  listOdooCompaniesForAutomation,
}))
vi.mock('@/src/modules/automatizaciones/infrastructure/automation-env', () => ({
  isAutomatizacionesConfigured,
}))
vi.mock('@/src/modules/automatizaciones/infrastructure/automation-repository.supabase', () => ({
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
}))
vi.mock('@/src/modules/portal/infrastructure/n8n-webhook-client', () => ({
  triggerAutomationWebhook,
}))

function sessionFor(role: 'admin' | 'advisor' | 'client'): PortalSession {
  return {
    user: { id: `auth-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

function automation(overrides: Partial<PortalAutomation> = {}): PortalAutomation {
  return {
    id: 'auto-1',
    slug: 'mi-flujo',
    title: 'Mi flujo',
    description: null,
    webhookPath: '/webhook/mi-flujo',
    icon: 'workflow',
    sortOrder: 1,
    isActive: true,
    visibility: 'all',
    grantedAdvisorIds: [],
    inputFields: [],
    ...overrides,
  }
}

function listItem(
  overrides: Partial<PortalAutomationListItem> = {}
): PortalAutomationListItem {
  return { ...automation(), lastRun: null, ...overrides }
}

beforeEach(() => {
  vi.resetAllMocks()
  resolveDirectoryActorId.mockResolvedValue('actor-1')
  isAutomatizacionesConfigured.mockReturnValue(true)
  fetchUserAutomationOrderMap.mockResolvedValue(new Map())
})

// ---------------------------------------------------------------------------
// requireStaffSession (via listAutomatizacionesAction)
// ---------------------------------------------------------------------------

describe('requireStaffSession (via listAutomatizacionesAction)', () => {
  it('returns unauthorized with no session', async () => {
    getSession.mockResolvedValue(null)

    const result = await listAutomatizacionesAction()

    expect(result).toEqual({ ok: false, error: 'unauthorized' })
  })

  it('returns forbidden for role=client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await listAutomatizacionesAction()

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(listPortalAutomationsWithLastRun).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// listAutomatizacionesAction
// ---------------------------------------------------------------------------

describe('listAutomatizacionesAction', () => {
  it('admin sees ALL active automations regardless of visibility/grantedAdvisorIds, and skips personal ordering entirely', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    listPortalAutomationsWithLastRun.mockResolvedValue([
      listItem({ id: 'a', visibility: 'none' }),
      listItem({ id: 'b', visibility: 'selected', grantedAdvisorIds: [] }),
      listItem({ id: 'c', isActive: false }),
    ])

    const result = await listAutomatizacionesAction()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.isAdmin).toBe(true)
      expect(result.data.automations.map((a) => a.id)).toEqual(['a', 'b', 'c'])
    }
    expect(fetchUserAutomationOrderMap).not.toHaveBeenCalled()
  })

  it('advisor sees only automations visible via advisorCanSeeAutomation: inactive/none/unselected are filtered out', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    listPortalAutomationsWithLastRun.mockResolvedValue([
      listItem({ id: 'visible-all', visibility: 'all' }),
      listItem({ id: 'hidden-none', visibility: 'none' }),
      listItem({ id: 'hidden-inactive', visibility: 'all', isActive: false }),
      listItem({
        id: 'granted-to-me',
        visibility: 'selected',
        grantedAdvisorIds: ['actor-1'],
      }),
      listItem({
        id: 'granted-to-someone-else',
        visibility: 'selected',
        grantedAdvisorIds: ['someone-else'],
      }),
    ])

    const result = await listAutomatizacionesAction()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.isAdmin).toBe(false)
      expect(result.data.automations.map((a) => a.id).sort()).toEqual(
        ['granted-to-me', 'visible-all'].sort()
      )
    }
  })

  it("applies the advisor's PERSONAL order over the global one when a personal order exists", async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    listPortalAutomationsWithLastRun.mockResolvedValue([
      listItem({ id: 'a' }),
      listItem({ id: 'b' }),
      listItem({ id: 'c' }),
    ])
    fetchUserAutomationOrderMap.mockResolvedValue(
      new Map([
        ['c', 0],
        ['a', 1],
      ])
    )

    const result = await listAutomatizacionesAction()

    expect(result.ok).toBe(true)
    if (result.ok) {
      // c, a ranked explicitly; b has no personal rank so falls after (global-index-based).
      expect(result.data.automations.map((a) => a.id)).toEqual(['c', 'a', 'b'])
    }
  })

  it('keeps the GLOBAL order for an advisor with no personal order at all', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    listPortalAutomationsWithLastRun.mockResolvedValue([
      listItem({ id: 'a' }),
      listItem({ id: 'b' }),
    ])
    fetchUserAutomationOrderMap.mockResolvedValue(new Map())

    const result = await listAutomatizacionesAction()

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.automations.map((a) => a.id)).toEqual(['a', 'b'])
    }
  })
})

// ---------------------------------------------------------------------------
// triggerAutomationAction
// ---------------------------------------------------------------------------

describe('triggerAutomationAction', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('advisor'))
  })

  it('returns not_configured BEFORE looking up the automation', async () => {
    isAutomatizacionesConfigured.mockReturnValue(false)

    const result = await triggerAutomationAction('auto-1')

    expect(result).toEqual({ ok: false, error: 'not_configured' })
    expect(getPortalAutomationById).not.toHaveBeenCalled()
  })

  it('returns not_found when the automation does not exist', async () => {
    getPortalAutomationById.mockResolvedValue(null)

    const result = await triggerAutomationAction('missing')

    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('blocks an advisor from running an automation with visibility="none", even with valid inputs', async () => {
    getPortalAutomationById.mockResolvedValue(automation({ visibility: 'none' }))

    const result = await triggerAutomationAction('auto-1')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(triggerAutomationWebhook).not.toHaveBeenCalled()
    expect(insertPortalAutomationRun).not.toHaveBeenCalled()
  })

  it('an admin CAN run an automation with visibility="none" that would block an advisor (adminCanSeeAutomation only checks isActive)', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    getPortalAutomationById.mockResolvedValue(automation({ visibility: 'none' }))
    triggerAutomationWebhook.mockResolvedValue({ ok: true, httpStatus: 200 })

    const result = await triggerAutomationAction('auto-1')

    expect(result.ok).toBe(true)
  })

  it('returns invalid_input and does NOT attempt the webhook or record a run when required inputs are missing', async () => {
    getPortalAutomationById.mockResolvedValue(
      automation({
        inputFields: [
          {
            key: 'foo',
            label: 'Foo',
            type: 'text',
            required: true,
            defaultValue: null,
            options: [],
          },
        ],
      })
    )

    const result = await triggerAutomationAction('auto-1', {})

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('invalid_input')
    expect(triggerAutomationWebhook).not.toHaveBeenCalled()
    expect(insertPortalAutomationRun).not.toHaveBeenCalled()
  })

  it('on webhook success: records a "sent" run and returns ok', async () => {
    getPortalAutomationById.mockResolvedValue(automation())
    triggerAutomationWebhook.mockResolvedValue({ ok: true, httpStatus: 200 })

    const result = await triggerAutomationAction('auto-1')

    expect(result).toEqual({ ok: true, data: { status: 'sent' } })
    expect(insertPortalAutomationRun).toHaveBeenCalledWith(
      expect.objectContaining({ automationId: 'auto-1', status: 'sent' })
    )
  })

  it('on webhook failure: records a "failed" run WITH a friendly error message, and returns webhook_failed', async () => {
    getPortalAutomationById.mockResolvedValue(automation())
    triggerAutomationWebhook.mockResolvedValue({
      ok: false,
      httpStatus: 404,
      errorMessage: 'not found',
    })

    const result = await triggerAutomationAction('auto-1')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('webhook_failed')
    expect(insertPortalAutomationRun).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'failed' })
    )
  })
})

// ---------------------------------------------------------------------------
// listAutomationRunsAction — admin sees ALL runs, advisor sees only THEIR OWN
// ---------------------------------------------------------------------------

describe('listAutomationRunsAction', () => {
  it('passes triggeredBy=undefined for an admin (sees every run)', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    listPortalAutomationRuns.mockResolvedValue([])

    await listAutomationRunsAction()

    expect(listPortalAutomationRuns).toHaveBeenCalledWith({
      limit: 30,
      triggeredBy: undefined,
    })
  })

  it('scopes to triggeredBy=actorId for an advisor (sees only their own runs)', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    listPortalAutomationRuns.mockResolvedValue([])

    await listAutomationRunsAction()

    expect(listPortalAutomationRuns).toHaveBeenCalledWith({
      limit: 30,
      triggeredBy: 'actor-1',
    })
  })
})

// ---------------------------------------------------------------------------
// Admin-only actions
// ---------------------------------------------------------------------------

describe('admin-only actions reject an advisor', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('advisor'))
  })

  it('updateAutomationAccessAction', async () => {
    const result = await updateAutomationAccessAction({
      automationId: 'auto-1',
      isActive: true,
      visibility: 'all',
      grantedAdvisorIds: [],
    })
    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(updatePortalAutomationAccess).not.toHaveBeenCalled()
  })

  it('listAutomationsForAccessAdminAction', async () => {
    const result = await listAutomationsForAccessAdminAction()
    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })

  it('updateAutomationAction', async () => {
    const result = await updateAutomationAction('auto-1', validCreateInput())
    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(getPortalAutomationById).not.toHaveBeenCalled()
  })

  it('deleteAutomationAction', async () => {
    const result = await deleteAutomationAction('auto-1')
    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(deletePortalAutomation).not.toHaveBeenCalled()
  })

  it('createAutomationAction', async () => {
    const result = await createAutomationAction(validCreateInput())
    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(insertPortalAutomation).not.toHaveBeenCalled()
  })
})

function validCreateInput(
  overrides: Partial<CreateAutomationInput> = {}
): CreateAutomationInput {
  return {
    slug: 'mi-flujo',
    title: 'Mi flujo',
    description: '',
    webhookPath: '/webhook/mi-flujo',
    icon: 'workflow',
    isActive: true,
    visibility: 'all',
    inputFields: [],
    ...overrides,
  }
}

describe('updateAutomationAccessAction (admin)', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('admin'))
    getPortalAutomationById.mockResolvedValue(automation())
  })

  it('returns not_found when the automation does not exist', async () => {
    getPortalAutomationById.mockResolvedValue(null)

    const result = await updateAutomationAccessAction({
      automationId: 'missing',
      isActive: true,
      visibility: 'all',
      grantedAdvisorIds: [],
    })

    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('FORCES grantedAdvisorIds to [] when visibility is NOT "selected", even if the caller sent ids', async () => {
    await updateAutomationAccessAction({
      automationId: 'auto-1',
      isActive: true,
      visibility: 'all',
      grantedAdvisorIds: ['someone'],
    })

    expect(updatePortalAutomationAccess).toHaveBeenCalledWith(
      expect.objectContaining({ visibility: 'all', grantedAdvisorIds: [] })
    )
  })

  it('keeps the given grantedAdvisorIds when visibility IS "selected"', async () => {
    await updateAutomationAccessAction({
      automationId: 'auto-1',
      isActive: true,
      visibility: 'selected',
      grantedAdvisorIds: ['advisor-a', 'advisor-b'],
    })

    expect(updatePortalAutomationAccess).toHaveBeenCalledWith(
      expect.objectContaining({ grantedAdvisorIds: ['advisor-a', 'advisor-b'] })
    )
  })
})

describe('createAutomationAction / updateAutomationAction validation + duplicate-slug mapping', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('admin'))
  })

  it('createAutomationAction rejects a slug that normalizes to empty (e.g. only symbols/dashes)', async () => {
    const result = await createAutomationAction(validCreateInput({ slug: '---' }))

    expect(result.ok).toBe(false)
    expect(insertPortalAutomation).not.toHaveBeenCalled()
  })

  it('createAutomationAction rejects an absolute (non-relative) webhookPath', async () => {
    const result = await createAutomationAction(
      validCreateInput({ webhookPath: 'https://evil.example.com/hook' })
    )

    expect(result.ok).toBe(false)
    expect(insertPortalAutomation).not.toHaveBeenCalled()
  })

  it('createAutomationAction rejects an unknown icon id', async () => {
    const result = await createAutomationAction(validCreateInput({ icon: 'not-a-real-icon' }))

    expect(result.ok).toBe(false)
    expect(insertPortalAutomation).not.toHaveBeenCalled()
  })

  it('createAutomationAction maps a duplicate-slug DB error (23505) to a friendly message with error="unknown"', async () => {
    getNextAutomationSortOrder.mockResolvedValue(1)
    insertPortalAutomation.mockRejectedValue({ code: '23505' })

    const result = await createAutomationAction(validCreateInput())

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('unknown')
      expect(result.message).toBe('Ya existe una automatización con ese identificador.')
    }
  })

  it('updateAutomationAction maps the SAME duplicate-slug DB error to error="invalid_input" (inconsistent with create, but this is current behavior)', async () => {
    getPortalAutomationById.mockResolvedValue(automation())
    updatePortalAutomationDefinition.mockRejectedValue({ code: '23505' })

    const result = await updateAutomationAction('auto-1', validCreateInput())

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('invalid_input')
      expect(result.message).toBe('Ya existe una automatización con ese identificador.')
    }
  })

  it('updateAutomationAction returns not_found when the automation does not exist', async () => {
    getPortalAutomationById.mockResolvedValue(null)

    const result = await updateAutomationAction('missing', validCreateInput())

    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(updatePortalAutomationDefinition).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// reorderAutomationsAction — dual branch: admin=global, advisor=personal
// ---------------------------------------------------------------------------

describe('reorderAutomationsAction', () => {
  it('rejects an effectively-empty order (blank/duplicate-only ids) as invalid_input, no repo calls', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))

    const result = await reorderAutomationsAction(['', '', ''])

    expect(result).toEqual({
      ok: false,
      error: 'invalid_input',
      message: 'Orden vacío.',
    })
    expect(listPortalAutomationsFromDb).not.toHaveBeenCalled()
  })

  it('dedups repeated ids, keeping only the FIRST occurrence', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    listPortalAutomationsFromDb.mockResolvedValue([
      automation({ id: 'a' }),
      automation({ id: 'b' }),
    ])

    await reorderAutomationsAction(['a', 'b', 'a'])

    expect(updateAutomationGlobalOrder).toHaveBeenCalledWith(['a', 'b'])
  })

  it('admin: returns not_found if any id is not in the catalog at all', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    listPortalAutomationsFromDb.mockResolvedValue([automation({ id: 'a' })])

    const result = await reorderAutomationsAction(['a', 'ghost'])

    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(updateAutomationGlobalOrder).not.toHaveBeenCalled()
  })

  it('admin: automations NOT included in the reorder subset keep their original global slot', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    listPortalAutomationsFromDb.mockResolvedValue([
      automation({ id: 'a' }),
      automation({ id: 'b' }),
      automation({ id: 'c' }),
    ])

    // Only reorder a and c; b (not mentioned) must keep its slot in the middle.
    await reorderAutomationsAction(['c', 'a'])

    expect(updateAutomationGlobalOrder).toHaveBeenCalledWith(['c', 'b', 'a'])
  })

  it('admin: calls the GLOBAL order function, never the personal one', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    listPortalAutomationsFromDb.mockResolvedValue([automation({ id: 'a' })])

    const result = await reorderAutomationsAction(['a'])

    expect(result).toEqual({ ok: true, data: { scope: 'global' } })
    expect(replaceUserAutomationOrder).not.toHaveBeenCalled()
  })

  it('advisor: is BLOCKED from reordering an automation they cannot see (visibility check per id)', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    listPortalAutomationsFromDb.mockResolvedValue([
      automation({ id: 'a', visibility: 'none' }),
    ])

    const result = await reorderAutomationsAction(['a'])

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(replaceUserAutomationOrder).not.toHaveBeenCalled()
  })

  it('advisor: calls the PERSONAL order function (scoped to actorId), never the global one', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    listPortalAutomationsFromDb.mockResolvedValue([
      automation({ id: 'a', visibility: 'all' }),
    ])

    const result = await reorderAutomationsAction(['a'])

    expect(result).toEqual({ ok: true, data: { scope: 'personal' } })
    expect(replaceUserAutomationOrder).toHaveBeenCalledWith('actor-1', ['a'])
    expect(updateAutomationGlobalOrder).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// listOdooCompaniesForAutomationAction
// ---------------------------------------------------------------------------

describe('listOdooCompaniesForAutomationAction', () => {
  it('returns forbidden for a client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await listOdooCompaniesForAutomationAction()

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(listOdooCompaniesForAutomation).not.toHaveBeenCalled()
  })

  it('maps odoo_unavailable to a not_configured error with a specific message', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    listOdooCompaniesForAutomation.mockResolvedValue({
      ok: false,
      error: 'odoo_unavailable',
    })

    const result = await listOdooCompaniesForAutomationAction()

    expect(result).toEqual({
      ok: false,
      error: 'not_configured',
      message: 'Odoo no está configurado en el portal.',
    })
  })

  it('maps odoo_request_failed to a DIFFERENT not_configured message', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    listOdooCompaniesForAutomation.mockResolvedValue({
      ok: false,
      error: 'odoo_request_failed',
    })

    const result = await listOdooCompaniesForAutomationAction()

    expect(result).toEqual({
      ok: false,
      error: 'not_configured',
      message: 'No se pudo cargar el catálogo de empresas de Odoo.',
    })
  })

  it('returns the companies on success', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    listOdooCompaniesForAutomation.mockResolvedValue({
      ok: true,
      companies: [{ id: 1, name: 'Empresa A' }],
    })

    const result = await listOdooCompaniesForAutomationAction()

    expect(result).toEqual({
      ok: true,
      data: { companies: [{ id: 1, name: 'Empresa A' }] },
    })
  })
})
