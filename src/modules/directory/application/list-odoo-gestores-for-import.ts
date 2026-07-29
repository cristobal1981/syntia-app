import { updateTag } from 'next/cache'

import type { OdooUserImportOption } from '@/src/modules/directory/domain/odoo-user-import'
import {
  getOdooGestorCatalog,
  ODOO_GESTOR_CATALOG_CACHE_TAG,
} from '@/src/modules/directory/infrastructure/odoo-gestor-catalog'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'

export type ListOdooGestoresForImportResult =
  | { ok: true; users: OdooUserImportOption[] }
  | { ok: false; error: 'odoo_unavailable' | 'odoo_request_failed' }

export async function listOdooGestoresForImport(): Promise<ListOdooGestoresForImportResult> {
  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  try {
    updateTag(ODOO_GESTOR_CATALOG_CACHE_TAG)
    const users = await getOdooGestorCatalog()
    return { ok: true, users }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('ODOO_')) {
      return { ok: false, error: 'odoo_request_failed' }
    }
    throw error
  }
}
