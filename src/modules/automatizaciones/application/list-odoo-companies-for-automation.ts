import type { OdooCompanyOption } from '@/src/modules/automatizaciones/domain/odoo-company-option'
import { getOdooCompanyCatalog } from '@/src/modules/automatizaciones/infrastructure/odoo-company-catalog'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'

export type ListOdooCompaniesForAutomationResult =
  | { ok: true; companies: OdooCompanyOption[] }
  | { ok: false; error: 'odoo_unavailable' | 'odoo_request_failed' }

export async function listOdooCompaniesForAutomation(): Promise<ListOdooCompaniesForAutomationResult> {
  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  try {
    const companies = await getOdooCompanyCatalog()
    return { ok: true, companies }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('ODOO_')) {
      return { ok: false, error: 'odoo_request_failed' }
    }
    throw error
  }
}
