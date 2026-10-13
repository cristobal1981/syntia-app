import { unstable_cache } from 'next/cache'

import {
  mapOdooUserRowToImportOption,
  type OdooUserImportOption,
  type OdooUserRow,
} from '@/src/modules/directory/domain/odoo-user-import'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

const ODOO_GESTOR_CATALOG_TTL_SECONDS = 600

export const ODOO_GESTOR_CATALOG_CACHE_TAG = 'odoo-gestor-catalog'

export async function listLinkedOdooUserIds(): Promise<number[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('users')
    .select('odoo_user_id')
    .in('role', ['advisor', 'admin'])
    .not('odoo_user_id', 'is', null)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? [])
    .map((row) => row.odoo_user_id)
    .filter((id): id is number => typeof id === 'number' && id > 0)
}

async function fetchOdooUsersForImport(
  linkedIds: number[]
): Promise<OdooUserImportOption[]> {
  const domain: unknown[] = [['partner_share', '=', false]]
  if (linkedIds.length > 0) {
    domain.push(['id', 'not in', linkedIds])
  }

  const rows = await odooSearchRead<OdooUserRow>('res.users', {
    domain,
    fields: ['name', 'login', 'email', 'phone'],
    order: 'name asc',
    limit: 200,
  })

  return rows.map(mapOdooUserRowToImportOption)
}

async function loadOdooGestorCatalog(): Promise<OdooUserImportOption[]> {
  const linkedIds = await listLinkedOdooUserIds()
  return fetchOdooUsersForImport(linkedIds)
}

export async function getOdooGestorCatalog(): Promise<OdooUserImportOption[]> {
  const cached = unstable_cache(loadOdooGestorCatalog, [ODOO_GESTOR_CATALOG_CACHE_TAG], {
    revalidate: ODOO_GESTOR_CATALOG_TTL_SECONDS,
    tags: [ODOO_GESTOR_CATALOG_CACHE_TAG],
  })

  return cached()
}
