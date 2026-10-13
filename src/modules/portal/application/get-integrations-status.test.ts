import { describe, expect, it, vi, beforeEach } from 'vitest'

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
  checkGoogleIntegration.mockReturnValue('connected')
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

  it('flags odoo/n8n as liveCheck=true, but google as liveCheck=false', async () => {
    const result = await getIntegrationsStatusForRole('admin')
    const byId = Object.fromEntries(result.map((row) => [row.id, row]))

    expect(byId.odoo.liveCheck).toBe(true)
    expect(byId.n8n.liveCheck).toBe(true)
    expect(byId.google.liveCheck).toBe(false)
  })

  it('maps each row to its human-readable name and resolved status', async () => {
    checkOdooHealth.mockResolvedValue('error')
    checkGoogleIntegration.mockReturnValue('pending')

    const result = await getIntegrationsStatusForRole('admin')
    const byId = Object.fromEntries(result.map((row) => [row.id, row]))

    expect(byId.odoo).toMatchObject({ name: 'Odoo', status: 'error' })
    expect(byId.google).toMatchObject({ name: 'Google Drive', status: 'pending' })
    expect(byId.n8n).toMatchObject({ name: 'n8n', status: 'connected' })
  })
})
