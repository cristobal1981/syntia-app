import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import type { ImpuestoSociedadesConfigInput } from '@/src/modules/automatizaciones/domain/impuesto-sociedades-config'
import {
  createImpuestoSociedadesConfigAction,
  deleteImpuestoSociedadesConfigAction,
  listImpuestoSociedadesConfigsAction,
  updateImpuestoSociedadesConfigAction,
} from '@/src/modules/automatizaciones/application/impuesto-sociedades-config-actions'

const {
  getSession,
  isSupabaseServiceRoleConfigured,
  listImpuestoSociedadesConfigs,
  insertImpuestoSociedadesConfig,
  updateImpuestoSociedadesConfig,
  deleteImpuestoSociedadesConfig,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  isSupabaseServiceRoleConfigured: vi.fn(),
  listImpuestoSociedadesConfigs: vi.fn(),
  insertImpuestoSociedadesConfig: vi.fn(),
  updateImpuestoSociedadesConfig: vi.fn(),
  deleteImpuestoSociedadesConfig: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  isSupabaseServiceRoleConfigured,
}))
vi.mock(
  '@/src/modules/automatizaciones/infrastructure/impuesto-sociedades-config-repository.supabase',
  () => ({
    listImpuestoSociedadesConfigs,
    insertImpuestoSociedadesConfig,
    updateImpuestoSociedadesConfig,
    deleteImpuestoSociedadesConfig,
  })
)

function sessionFor(role: 'admin' | 'advisor' | 'client'): PortalSession {
  return {
    user: { id: `auth-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

function validInput(
  overrides: Partial<ImpuestoSociedadesConfigInput> = {}
): ImpuestoSociedadesConfigInput {
  return {
    anio: 2026,
    tipoEmpresaKey: 'general',
    esEscala: false,
    tipoGravamenFijo: 25,
    baseGravamen: null,
    tipoGravamenBase: null,
    tipoGravamenRestante: null,
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  isSupabaseServiceRoleConfigured.mockReturnValue(true)
})

describe('admin-only gate (getAdminSession)', () => {
  it.each(['advisor', 'client'] as const)(
    'listImpuestoSociedadesConfigsAction: forbidden for role=%s',
    async (role) => {
      getSession.mockResolvedValue(sessionFor(role))

      const result = await listImpuestoSociedadesConfigsAction()

      expect(result).toEqual({
        ok: false,
        message: 'No tienes permiso para esta acción.',
      })
      expect(listImpuestoSociedadesConfigs).not.toHaveBeenCalled()
    }
  )

  it('returns forbidden with no session at all', async () => {
    getSession.mockResolvedValue(null)

    const result = await createImpuestoSociedadesConfigAction(validInput())

    expect(result.ok).toBe(false)
    expect(insertImpuestoSociedadesConfig).not.toHaveBeenCalled()
  })

  it('allows role=admin through the gate', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))
    listImpuestoSociedadesConfigs.mockResolvedValue([])

    const result = await listImpuestoSociedadesConfigsAction()

    expect(result.ok).toBe(true)
  })
})

describe('listImpuestoSociedadesConfigsAction (Supabase-not-configured is NOT an error here — unlike the other 3 actions)', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('admin'))
  })

  it('returns ok:true with configured:false and an empty list when Supabase is not configured', async () => {
    isSupabaseServiceRoleConfigured.mockReturnValue(false)

    const result = await listImpuestoSociedadesConfigsAction()

    expect(result).toEqual({ ok: true, data: { configured: false, configs: [] } })
    expect(listImpuestoSociedadesConfigs).not.toHaveBeenCalled()
  })

  it('returns ok:false on a repository error (does not throw)', async () => {
    listImpuestoSociedadesConfigs.mockRejectedValue(new Error('db down'))

    const result = await listImpuestoSociedadesConfigsAction()

    expect(result).toEqual({ ok: false, message: 'No pudimos cargar la configuración.' })
  })
})

describe('createImpuestoSociedadesConfigAction', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('admin'))
  })

  it('returns an error (not ok:true) when Supabase is not configured, UNLIKE the list action', async () => {
    isSupabaseServiceRoleConfigured.mockReturnValue(false)

    const result = await createImpuestoSociedadesConfigAction(validInput())

    expect(result).toEqual({ ok: false, message: 'Supabase no está configurado.' })
    expect(insertImpuestoSociedadesConfig).not.toHaveBeenCalled()
  })

  it('rejects invalid input (delegates real validation) without touching the repository', async () => {
    const result = await createImpuestoSociedadesConfigAction(
      validInput({ anio: 1900 })
    )

    expect(result.ok).toBe(false)
    expect(insertImpuestoSociedadesConfig).not.toHaveBeenCalled()
  })

  it('maps a duplicate (23505) DB error to a specific message', async () => {
    insertImpuestoSociedadesConfig.mockRejectedValue({ code: '23505' })

    const result = await createImpuestoSociedadesConfigAction(validInput())

    expect(result).toEqual({
      ok: false,
      message: 'Ya existe una configuración para ese ejercicio y tipo de empresa.',
    })
  })

  it('maps any OTHER DB error to a generic retry message', async () => {
    insertImpuestoSociedadesConfig.mockRejectedValue(new Error('connection reset'))

    const result = await createImpuestoSociedadesConfigAction(validInput())

    expect(result).toEqual({
      ok: false,
      message: 'No pudimos guardar los cambios. Inténtalo de nuevo.',
    })
  })

  it('succeeds with valid input', async () => {
    insertImpuestoSociedadesConfig.mockResolvedValue({ id: 'cfg-1' })

    const result = await createImpuestoSociedadesConfigAction(validInput())

    expect(result).toEqual({ ok: true, data: { id: 'cfg-1' } })
  })
})

describe('updateImpuestoSociedadesConfigAction', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('admin'))
  })

  it('rejects invalid input without touching the repository', async () => {
    const result = await updateImpuestoSociedadesConfigAction(
      'cfg-1',
      validInput({ tipoGravamenFijo: 999 })
    )

    expect(result.ok).toBe(false)
    expect(updateImpuestoSociedadesConfig).not.toHaveBeenCalled()
  })

  it('maps a duplicate (23505) DB error to a specific message', async () => {
    updateImpuestoSociedadesConfig.mockRejectedValue({ code: '23505' })

    const result = await updateImpuestoSociedadesConfigAction('cfg-1', validInput())

    expect(result).toEqual({
      ok: false,
      message: 'Ya existe una configuración para ese ejercicio y tipo de empresa.',
    })
  })

  it('succeeds with valid input, passing the id through', async () => {
    updateImpuestoSociedadesConfig.mockResolvedValue({ id: 'cfg-1' })

    await updateImpuestoSociedadesConfigAction('cfg-1', validInput())

    expect(updateImpuestoSociedadesConfig).toHaveBeenCalledWith(
      'cfg-1',
      expect.objectContaining({ anio: 2026 })
    )
  })
})

describe('deleteImpuestoSociedadesConfigAction', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('admin'))
  })

  it('returns forbidden for a non-admin', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))

    const result = await deleteImpuestoSociedadesConfigAction('cfg-1')

    expect(result.ok).toBe(false)
    expect(deleteImpuestoSociedadesConfig).not.toHaveBeenCalled()
  })

  it('returns an error when Supabase is not configured', async () => {
    isSupabaseServiceRoleConfigured.mockReturnValue(false)

    const result = await deleteImpuestoSociedadesConfigAction('cfg-1')

    expect(result).toEqual({ ok: false, message: 'Supabase no está configurado.' })
  })

  it('maps a repository error to a generic delete-failed message', async () => {
    deleteImpuestoSociedadesConfig.mockRejectedValue(new Error('db down'))

    const result = await deleteImpuestoSociedadesConfigAction('cfg-1')

    expect(result).toEqual({ ok: false, message: 'No pudimos eliminar el registro.' })
  })

  it('succeeds and calls the repository with the given id', async () => {
    deleteImpuestoSociedadesConfig.mockResolvedValue(undefined)

    const result = await deleteImpuestoSociedadesConfigAction('cfg-1')

    expect(result).toEqual({ ok: true, data: true })
    expect(deleteImpuestoSociedadesConfig).toHaveBeenCalledWith('cfg-1')
  })
})
