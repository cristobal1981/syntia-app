import { describe, expect, it, vi, beforeEach } from 'vitest'

import { listOdooCompaniesForAutomation } from '@/src/modules/automatizaciones/application/list-odoo-companies-for-automation'

const { getOdooCompanyCatalog, isOdooApiConfigured } = vi.hoisted(() => ({
  getOdooCompanyCatalog: vi.fn(),
  isOdooApiConfigured: vi.fn(),
}))

vi.mock('@/src/modules/automatizaciones/infrastructure/odoo-company-catalog', () => ({
  getOdooCompanyCatalog,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  isOdooApiConfigured,
}))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listOdooCompaniesForAutomation', () => {
  it('returns odoo_unavailable WITHOUT calling the catalog when Odoo is not configured', async () => {
    isOdooApiConfigured.mockReturnValue(false)

    const result = await listOdooCompaniesForAutomation()

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(getOdooCompanyCatalog).not.toHaveBeenCalled()
  })

  it('maps an ODOO_-prefixed error to odoo_request_failed', async () => {
    isOdooApiConfigured.mockReturnValue(true)
    getOdooCompanyCatalog.mockRejectedValue(new Error('ODOO_TIMEOUT'))

    const result = await listOdooCompaniesForAutomation()

    expect(result).toEqual({ ok: false, error: 'odoo_request_failed' })
  })

  it('RE-THROWS a non-ODOO_ error instead of swallowing it as odoo_request_failed', async () => {
    isOdooApiConfigured.mockReturnValue(true)
    getOdooCompanyCatalog.mockRejectedValue(new Error('unexpected boom'))

    await expect(listOdooCompaniesForAutomation()).rejects.toThrow('unexpected boom')
  })

  it('returns the companies on success', async () => {
    isOdooApiConfigured.mockReturnValue(true)
    getOdooCompanyCatalog.mockResolvedValue([{ id: 1, name: 'Empresa A' }])

    const result = await listOdooCompaniesForAutomation()

    expect(result).toEqual({ ok: true, companies: [{ id: 1, name: 'Empresa A' }] })
  })
})
