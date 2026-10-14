import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import type { PortalAutomation } from '@/src/modules/automatizaciones/domain/types'
import {
  createAutomationAction,
  deleteAutomationAction,
  updateAutomationAccessAction,
  updateAutomationAction,
  type CreateAutomationInput,
} from '@/src/modules/automatizaciones/application/automatizaciones-crud-actions'

const {
  getSession,
  resolveDirectoryActorId,
  deletePortalAutomation,
  getNextAutomationSortOrder,
  getPortalAutomationById,
  insertPortalAutomation,
  updatePortalAutomationAccess,
  updatePortalAutomationDefinition,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
  deletePortalAutomation: vi.fn(),
  getNextAutomationSortOrder: vi.fn(),
  getPortalAutomationById: vi.fn(),
  insertPortalAutomation: vi.fn(),
  updatePortalAutomationAccess: vi.fn(),
  updatePortalAutomationDefinition: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId,
}))
vi.mock('@/src/modules/automatizaciones/infrastructure/automation-repository.supabase', () => ({
  deletePortalAutomation,
  getNextAutomationSortOrder,
  getPortalAutomationById,
  insertPortalAutomation,
  updatePortalAutomationAccess,
  updatePortalAutomationDefinition,
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

function input(overrides: Partial<CreateAutomationInput> = {}): CreateAutomationInput {
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

beforeEach(() => {
  vi.resetAllMocks()
  resolveDirectoryActorId.mockResolvedValue('actor-1')
})

describe('auth guards on every CRUD action', () => {
  const calls: Array<[string, () => Promise<unknown>]> = [
    ['create', () => createAutomationAction(input())],
    ['update', () => updateAutomationAction('auto-1', input())],
    ['delete', () => deleteAutomationAction('auto-1')],
    [
      'access',
      () =>
        updateAutomationAccessAction({
          automationId: 'auto-1',
          isActive: true,
          visibility: 'all',
          grantedAdvisorIds: [],
        }),
    ],
  ]

  for (const [name, call] of calls) {
    it(`${name}: no session -> unauthorized, nothing written`, async () => {
      getSession.mockResolvedValue(null)
      expect(await call()).toEqual({ ok: false, error: 'unauthorized' })
      expect(insertPortalAutomation).not.toHaveBeenCalled()
      expect(updatePortalAutomationDefinition).not.toHaveBeenCalled()
      expect(deletePortalAutomation).not.toHaveBeenCalled()
      expect(updatePortalAutomationAccess).not.toHaveBeenCalled()
    })

    it(`${name}: client -> forbidden (staff guard)`, async () => {
      getSession.mockResolvedValue(sessionFor('client'))
      expect(await call()).toEqual({ ok: false, error: 'forbidden' })
      expect(getPortalAutomationById).not.toHaveBeenCalled()
      expect(insertPortalAutomation).not.toHaveBeenCalled()
    })

    it(`${name}: advisor -> forbidden (admin only)`, async () => {
      getSession.mockResolvedValue(sessionFor('advisor'))
      expect(await call()).toEqual({ ok: false, error: 'forbidden' })
      expect(insertPortalAutomation).not.toHaveBeenCalled()
      expect(updatePortalAutomationDefinition).not.toHaveBeenCalled()
      expect(deletePortalAutomation).not.toHaveBeenCalled()
      expect(updatePortalAutomationAccess).not.toHaveBeenCalled()
    })
  }
})

describe('createAutomationAction (admin)', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('admin'))
  })

  it('invalid input returns error="unknown" (DIFFERENT from update, which returns invalid_input) and never inserts', async () => {
    const result = await createAutomationAction(input({ title: '   ' }))
    expect(result).toEqual({
      ok: false,
      error: 'unknown',
      message: 'El título es obligatorio.',
    })
    expect(getNextAutomationSortOrder).not.toHaveBeenCalled()
    expect(insertPortalAutomation).not.toHaveBeenCalled()
  })

  it('propagates input-field validation errors', async () => {
    const result = await createAutomationAction(
      input({
        inputFields: [
          { key: 'Mal Clave', label: 'x', type: 'text', required: true, defaultValue: null, options: [] },
        ],
      })
    )
    expect(result.ok).toBe(false)
    expect(insertPortalAutomation).not.toHaveBeenCalled()
  })

  it('rejects "://" in the webhook path even when it starts with "/"', async () => {
    const result = await createAutomationAction(
      input({ webhookPath: '/x?u=http://evil' })
    )
    expect(result.ok).toBe(false)
    expect(insertPortalAutomation).not.toHaveBeenCalled()
  })

  it('normalises slug/title/description/path and inserts with the next sort order', async () => {
    getNextAutomationSortOrder.mockResolvedValue(7)
    insertPortalAutomation.mockResolvedValue(automation({ sortOrder: 7 }))

    const result = await createAutomationAction(
      input({
        slug: '  Mi  Flujo!! ',
        title: '  Mi flujo ',
        description: '  desc ',
        webhookPath: ' /webhook/x ',
        visibility: 'selected',
        isActive: false,
      })
    )

    expect(insertPortalAutomation).toHaveBeenCalledWith({
      slug: 'mi-flujo',
      title: 'Mi flujo',
      description: 'desc',
      webhookPath: '/webhook/x',
      icon: 'workflow',
      sortOrder: 7,
      isActive: false,
      visibility: 'selected',
      inputFields: [],
    })
    expect(result).toEqual({
      ok: true,
      data: { automation: { ...automation({ sortOrder: 7 }), lastRun: null } },
    })
  })

  it('stores an empty description as null', async () => {
    getNextAutomationSortOrder.mockResolvedValue(0)
    insertPortalAutomation.mockResolvedValue(automation())
    await createAutomationAction(input({ description: '   ' }))
    expect(insertPortalAutomation).toHaveBeenCalledWith(
      expect.objectContaining({ description: null })
    )
  })

  it('non-duplicate DB error surfaces its message as "unknown"', async () => {
    getNextAutomationSortOrder.mockResolvedValue(0)
    insertPortalAutomation.mockRejectedValue(new Error('boom'))
    const result = await createAutomationAction(input())
    expect(result).toEqual({ ok: false, error: 'unknown', message: 'boom' })
  })
})

describe('updateAutomationAction (admin)', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('admin'))
  })

  it('checks existence BEFORE validating input (not_found wins over invalid_input)', async () => {
    getPortalAutomationById.mockResolvedValue(null)
    const result = await updateAutomationAction('x', input({ title: '' }))
    expect(result).toEqual({ ok: false, error: 'not_found' })
  })

  it('invalid input -> invalid_input with message, no write', async () => {
    getPortalAutomationById.mockResolvedValue(automation())
    const result = await updateAutomationAction('auto-1', input({ icon: 'nope' }))
    expect(result).toEqual({
      ok: false,
      error: 'invalid_input',
      message: 'Icono no válido.',
    })
    expect(updatePortalAutomationDefinition).not.toHaveBeenCalled()
  })

  it('writes the normalised definition for the given id', async () => {
    getPortalAutomationById.mockResolvedValue(automation())
    const result = await updateAutomationAction(
      'auto-1',
      input({ slug: 'Otro Slug', description: '' })
    )
    expect(result).toEqual({ ok: true, data: { saved: true } })
    expect(updatePortalAutomationDefinition).toHaveBeenCalledWith({
      automationId: 'auto-1',
      slug: 'otro-slug',
      title: 'Mi flujo',
      description: null,
      webhookPath: '/webhook/mi-flujo',
      icon: 'workflow',
      isActive: true,
      visibility: 'all',
      inputFields: [],
    })
  })

  it('non-duplicate DB error -> unknown with message', async () => {
    getPortalAutomationById.mockResolvedValue(automation())
    updatePortalAutomationDefinition.mockRejectedValue(new Error('db down'))
    const result = await updateAutomationAction('auto-1', input())
    expect(result).toEqual({ ok: false, error: 'unknown', message: 'db down' })
  })
})

describe('deleteAutomationAction / updateAutomationAccessAction (admin)', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('admin'))
  })

  it('delete: not_found does not delete; found deletes by id', async () => {
    getPortalAutomationById.mockResolvedValueOnce(null)
    expect(await deleteAutomationAction('x')).toEqual({ ok: false, error: 'not_found' })
    expect(deletePortalAutomation).not.toHaveBeenCalled()

    getPortalAutomationById.mockResolvedValueOnce(automation())
    expect(await deleteAutomationAction('auto-1')).toEqual({
      ok: true,
      data: { deleted: true },
    })
    expect(deletePortalAutomation).toHaveBeenCalledWith('auto-1')
  })

  it('delete: repository error -> unknown with message', async () => {
    getPortalAutomationById.mockResolvedValue(automation())
    deletePortalAutomation.mockRejectedValue(new Error('fk'))
    expect(await deleteAutomationAction('auto-1')).toEqual({
      ok: false,
      error: 'unknown',
      message: 'fk',
    })
  })

  it('access: passes isActive and automationId through; repo error -> unknown', async () => {
    getPortalAutomationById.mockResolvedValue(automation())
    await updateAutomationAccessAction({
      automationId: 'auto-1',
      isActive: false,
      visibility: 'selected',
      grantedAdvisorIds: ['a'],
    })
    expect(updatePortalAutomationAccess).toHaveBeenCalledWith({
      automationId: 'auto-1',
      isActive: false,
      visibility: 'selected',
      grantedAdvisorIds: ['a'],
    })

    updatePortalAutomationAccess.mockRejectedValue(new Error('x'))
    expect(
      await updateAutomationAccessAction({
        automationId: 'auto-1',
        isActive: true,
        visibility: 'all',
        grantedAdvisorIds: [],
      })
    ).toEqual({ ok: false, error: 'unknown', message: 'x' })
  })
})
