import { revalidateTag } from 'next/cache'

import type { OdooUserImportOption } from '@/src/modules/directory/domain/odoo-user-import'
import {
  getOdooGestorCatalog,
  ODOO_GESTOR_CATALOG_CACHE_TAG,
} from '@/src/modules/directory/infrastructure/odoo-gestor-catalog'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'

type ListOdooGestoresForImportResult =
  | { ok: true; users: OdooUserImportOption[] }
  | { ok: false; error: 'odoo_unavailable' | 'odoo_request_failed' }

/** Fuerza refresco del catálogo cacheado antes de leerlo: el staff abre el importador para ver altas recientes en Odoo. */
export async function listOdooGestoresForImport(): Promise<ListOdooGestoresForImportResult> {
  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  try {
    revalidateTag(ODOO_GESTOR_CATALOG_CACHE_TAG, 'max')
    const users = await getOdooGestorCatalog()
    return { ok: true, users }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('ODOO_')) {
      return { ok: false, error: 'odoo_request_failed' }
    }
    throw error
  }
}
