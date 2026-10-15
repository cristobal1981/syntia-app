import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import type { PortalAutomation } from '@/src/modules/automatizaciones/domain/types'
import {
  reorderAutomationsAction,
  triggerAutomationAction,
} from '@/src/modules/automatizaciones/application/automatizaciones-run-actions'

const {
  getSession,
  resolveDirectoryActorId,
  isAutomatizacionesConfigured,
  getPortalAutomationById,
  insertPortalAutomationRun,
  listPortalAutomationsFromDb,
  replaceUserAutomationOrder,
  updateAutomationGlobalOrder,
  triggerAutomationWebhook,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
  isAutomatizacionesConfigured: vi.fn(),
  getPortalAutomationById: vi.fn(),
  insertPortalAutomationRun: vi.fn(),
  listPortalAutomationsFromDb: vi.fn(),
  replaceUserAutomationOrder: vi.fn(),
  updateAutomationGlobalOrder: vi.fn(),
  triggerAutomationWebhook: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))
vi.mock('@/src/modules/automatizaciones/infrastructure/automation-env', () => ({
  isAutomatizacionesConfigured,
}))
vi.mock('@/src/modules/automatizaciones/infrastructure/automation-repository.supabase', () => ({
  getPortalAutomationById,
  insertPortalAutomationRun,
  listPortalAutomationsFromDb,
  replaceUserAutomationOrder,
  updateAutomationGlobalOrder,
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

beforeEach(() => {
  vi.resetAllMocks()
  resolveDirectoryActorId.mockResolvedValue('actor-1')
  isAutomatizacionesConfigured.mockReturnValue(true)
})

describe('triggerAutomationAction', () => {
  it('no session -> unauthorized; client -> forbidden; webhook never called', async () => {
    getSession.mockResolvedValueOnce(null)
    expect(await triggerAutomationAction('auto-1')).toEqual({
      ok: false,
      error: 'unauthorized',
    })
    getSession.mockResolvedValueOnce(sessionFor('client'))
    expect(await triggerAutomationAction('auto-1')).toEqual({
      ok: false,
      error: 'forbidden',
    })
    expect(isAutomatizacionesConfigured).not.toHaveBeenCalled()
    expect(triggerAutomationWebhook).not.toHaveBeenCalled()
  })

  it('advisor with a "selected" grant can run; an ungranted advisor cannot', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    triggerAutomationWebhook.mockResolvedValue({ ok: true, httpStatus: 200 })

    getPortalAutomationById.mockResolvedValue(
      automation({ visibility: 'selected', grantedAdvisorIds: ['actor-1'] })
    )
    expect((await triggerAutomationAction('auto-1')).ok).toBe(true)

    getPortalAutomationById.mockResolvedValue(
      automation({ visibility: 'selected', grantedAdvisorIds: ['otro'] })
    )
    expect(await triggerAutomationAction('auto-1')).toEqual({
      ok: false,
      error: 'forbidden',
    })
    expect(triggerAutomationWebhook).toHaveBeenCalledTimes(1)
  })

  it('inactive automation: forbidden for admin AND advisor', async () => {
    getPortalAutomationById.mockResolvedValue(automation({ isActive: false }))
    for (const role of ['admin', 'advisor'] as const) {
      getSession.mockResolvedValue(sessionFor(role))
      expect(await triggerAutomationAction('auto-1')).toEqual({
        ok: false,
        error: 'forbidden',
      })
    }
    expect(triggerAutomationWebhook).not.toHaveBeenCalled()
  })

  it('sends the validated payload to the automation webhook path and records the run with the actor id', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    getPortalAutomationById.mockResolvedValue(
      automation({
        inputFields: [
          { key: 'campo', label: 'Campo', type: 'text', required: true, defaultValue: null, options: [] },
        ],
      })
    )
    triggerAutomationWebhook.mockResolvedValue({ ok: true, httpStatus: 202 })

    await triggerAutomationAction('auto-1', { campo: ' hola ', extra: 'no' })

    expect(triggerAutomationWebhook).toHaveBeenCalledWith('/webhook/mi-flujo', {
      campo: 'hola',
    })
    expect(insertPortalAutomationRun).toHaveBeenCalledWith({
      automationId: 'auto-1',
      triggeredBy: 'actor-1',
      status: 'sent',
      httpStatus: 202,
      errorMessage: undefined,
    })
  })

  it('invalid value for a select is rejected before the webhook', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    getPortalAutomationById.mockResolvedValue(
      automation({
        inputFields: [
          {
            key: 's',
            label: 'S',
            type: 'select',
            required: true,
            defaultValue: null,
            options: [{ value: 'a', label: 'A' }],
          },
        ],
      })
    )
    const result = await triggerAutomationAction('auto-1', { s: 'zzz' })
    expect(result).toMatchObject({ ok: false, error: 'invalid_input' })
    expect(triggerAutomationWebhook).not.toHaveBeenCalled()
  })

  it('unexpected exception -> unknown (does not throw)', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    getPortalAutomationById.mockRejectedValue(new Error('db'))
    const result = await triggerAutomationAction('auto-1')
    expect(result).toMatchObject({ ok: false, error: 'unknown' })
  })
})

describe('reorderAutomationsAction', () => {
  it('no session -> unauthorized; client -> forbidden; no repo access', async () => {
    getSession.mockResolvedValueOnce(null)
    expect(await reorderAutomationsAction(['a'])).toEqual({
      ok: false,
      error: 'unauthorized',
    })
    getSession.mockResolvedValueOnce(sessionFor('client'))
    expect(await reorderAutomationsAction(['a'])).toEqual({
      ok: false,
      error: 'forbidden',
    })
    expect(listPortalAutomationsFromDb).not.toHaveBeenCalled()
    expect(updateAutomationGlobalOrder).not.toHaveBeenCalled()
    expect(replaceUserAutomationOrder).not.toHaveBeenCalled()
  })

  it('admin: merges the subset into the global order preserving other slots', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    listPortalAutomationsFromDb.mockResolvedValue([
      automation({ id: 'a' }),
      automation({ id: 'x', isActive: false }),
      automation({ id: 'b' }),
      automation({ id: 'c' }),
    ])
    const result = await reorderAutomationsAction(['c', 'a', 'b'])
    expect(result).toEqual({ ok: true, data: { scope: 'global' } })
    expect(updateAutomationGlobalOrder).toHaveBeenCalledWith(['c', 'x', 'a', 'b'])
    expect(replaceUserAutomationOrder).not.toHaveBeenCalled()
  })

  it('advisor: an inactive or unknown id blocks the whole reorder', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    listPortalAutomationsFromDb.mockResolvedValue([
      automation({ id: 'a' }),
      automation({ id: 'off', isActive: false }),
    ])
    expect(await reorderAutomationsAction(['a', 'off'])).toEqual({
      ok: false,
      error: 'forbidden',
    })
    expect(await reorderAutomationsAction(['a', 'ghost'])).toEqual({
      ok: false,
      error: 'forbidden',
    })
    expect(replaceUserAutomationOrder).not.toHaveBeenCalled()
  })

  it('advisor: saves the deduped order for their actor id', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    listPortalAutomationsFromDb.mockResolvedValue([
      automation({ id: 'a' }),
      automation({ id: 'b', visibility: 'selected', grantedAdvisorIds: ['actor-1'] }),
    ])
    const result = await reorderAutomationsAction(['b', 'a', 'b'])
    expect(result).toEqual({ ok: true, data: { scope: 'personal' } })
    expect(replaceUserAutomationOrder).toHaveBeenCalledWith('actor-1', ['b', 'a'])
  })
})
