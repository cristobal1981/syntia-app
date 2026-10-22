import { describe, expect, it, vi, beforeEach } from 'vitest'

const { unstableCache } = vi.hoisted(() => ({ unstableCache: vi.fn() }))
vi.mock('next/cache', () => ({ unstable_cache: unstableCache }))

import { getIntegrationsStatusForRole } from '@/src/modules/portal/application/get-integrations-status'

const { checkGoogleIntegration, checkN8nHealth, checkOdooHealth } = vi.hoisted(() => ({
  checkGoogleIntegration: vi.fn(),
  checkN8nHealth: vi.fn(),
  checkOdooHealth: vi.fn(),
}))

vi.mock('@/src/modules/portal/infrastructure/check-google-integration', () => ({
  checkGoogleIntegration,
}))
vi.mock('@/src/modules/portal/infrastructure/check-n8n-health', () => ({ checkN8nHealth }))
vi.mock('@/src/modules/portal/infrastructure/check-odoo-health', () => ({ checkOdooHealth }))

beforeEach(() => {
  vi.resetAllMocks()
  unstableCache.mockImplementation((fn: () => unknown) => fn)
  checkGoogleIntegration.mockResolvedValue('connected')
  checkN8nHealth.mockResolvedValue('connected')
  checkOdooHealth.mockResolvedValue('connected')
})

describe('getIntegrationsStatusForRole', () => {
  it('returns [] for client/worker WITHOUT calling any health check (no integrations for those roles)', async () => {
    const result = await getIntegrationsStatusForRole('client')

    expect(result).toEqual([])
    expect(checkOdooHealth).not.toHaveBeenCalled()
    expect(checkN8nHealth).not.toHaveBeenCalled()
    expect(checkGoogleIntegration).not.toHaveBeenCalled()
  })

  it('for advisor: checks odoo+google, but NEVER n8n (admin-only integration)', async () => {
    await getIntegrationsStatusForRole('advisor')

    expect(checkOdooHealth).toHaveBeenCalledTimes(1)
    expect(checkGoogleIntegration).toHaveBeenCalledTimes(1)
    expect(checkN8nHealth).not.toHaveBeenCalled()
  })

  it('for admin: checks all three, including n8n', async () => {
    await getIntegrationsStatusForRole('admin')

    expect(checkOdooHealth).toHaveBeenCalledTimes(1)
    expect(checkGoogleIntegration).toHaveBeenCalledTimes(1)
    expect(checkN8nHealth).toHaveBeenCalledTimes(1)
  })

  it('flags odoo, n8n and google as liveCheck=true (all three are pinged)', async () => {
    const result = await getIntegrationsStatusForRole('admin')
    const byId = Object.fromEntries(result.map((row) => [row.id, row]))

    expect(byId.odoo.liveCheck).toBe(true)
    expect(byId.n8n.liveCheck).toBe(true)
    expect(byId.google.liveCheck).toBe(true)
  })

  it('reports the ping time in ms for connected rows and null otherwise', async () => {
    checkOdooHealth.mockResolvedValue('error')
    checkN8nHealth.mockResolvedValue('pending')
    checkGoogleIntegration.mockResolvedValue('connected')

    const result = await getIntegrationsStatusForRole('admin')
    const byId = Object.fromEntries(result.map((row) => [row.id, row]))

    expect(typeof byId.google.latencyMs).toBe('number')
    expect(byId.google.latencyMs).toBeGreaterThanOrEqual(0)
    expect(byId.odoo.latencyMs).toBeNull()
    expect(byId.n8n.latencyMs).toBeNull()
  })

  it('maps each row to its human-readable name and resolved status', async () => {
    checkOdooHealth.mockResolvedValue('error')
    checkGoogleIntegration.mockResolvedValue('pending')

    const result = await getIntegrationsStatusForRole('admin')
    const byId = Object.fromEntries(result.map((row) => [row.id, row]))

    expect(byId.odoo).toMatchObject({ name: 'Odoo', status: 'error' })
    expect(byId.google).toMatchObject({ name: 'Google Drive', status: 'pending' })
    expect(byId.n8n).toMatchObject({ name: 'n8n', status: 'connected' })
  })

  it('por defecto pasa por el caché de un minuto, con clave propia de cada integración', async () => {
    await getIntegrationsStatusForRole('admin')

    const keys = unstableCache.mock.calls.map(([, key]) => key)
    expect(keys).toEqual([
      ['integration-health', 'odoo'],
      ['integration-health', 'google'],
      ['integration-health', 'n8n'],
    ])
    for (const [, , options] of unstableCache.mock.calls) {
      expect(options).toEqual({ revalidate: 60 })
    }
  })

  it('con fresh=true no usa el caché y comprueba cada integración', async () => {
    const result = await getIntegrationsStatusForRole('admin', { fresh: true })

    expect(unstableCache).not.toHaveBeenCalled()
    expect(result).toHaveLength(3)
    expect(checkOdooHealth).toHaveBeenCalledTimes(1)
    expect(checkN8nHealth).toHaveBeenCalledTimes(1)
    expect(checkGoogleIntegration).toHaveBeenCalledTimes(1)
  })

  it('sin integraciones (cliente) no toca el caché', async () => {
    await getIntegrationsStatusForRole('client')
    expect(unstableCache).not.toHaveBeenCalled()
  })
})
