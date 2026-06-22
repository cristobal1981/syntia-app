import type { OdooPartnerImportOption } from '@/src/modules/directory/domain/odoo-partner-import'
import { getOdooPartnerCatalog } from '@/src/modules/directory/infrastructure/odoo-partner-catalog'
import { ODOO_PARTNER_CATALOG_CACHE_TAG } from '@/src/modules/directory/infrastructure/odoo-partner-env'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { updateTag } from 'next/cache'
export type ListOdooPartnersForImportResult =
  | { ok: true; partners: OdooPartnerImportOption[] }
  | { ok: false; error: 'odoo_unavailable' | 'odoo_request_failed' }

export async function listOdooPartnersForImport(): Promise<ListOdooPartnersForImportResult> {
  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  try {
    updateTag(ODOO_PARTNER_CATALOG_CACHE_TAG)
    const partners = await getOdooPartnerCatalog()
    return { ok: true, partners }  } catch (error) {
    if (error instanceof Error && error.message.startsWith('ODOO_')) {
      return { ok: false, error: 'odoo_request_failed' }
    }
    throw error
  }
}
