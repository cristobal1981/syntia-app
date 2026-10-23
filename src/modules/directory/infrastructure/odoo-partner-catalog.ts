import { unstable_cache } from 'next/cache'

import {
  mapOdooPartnerRowToImportOption,
  type OdooPartnerImportOption,
  type OdooPartnerRow,
} from '@/src/modules/directory/domain/odoo-partner-import'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import {
  getOdooContactEmailFieldName,
  getOdooPartnerCatalogTtlSeconds,
  ODOO_PARTNER_CATALOG_CACHE_TAG,
} from '@/src/modules/directory/infrastructure/odoo-partner-env'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

/** La clave incluye el campo de correo configurable y `includeLinked` para no mezclar catálogos distintos. */
function getOdooPartnerCatalogCacheKey(includeLinked: boolean): string[] {
  return [
    ODOO_PARTNER_CATALOG_CACHE_TAG,
    getOdooContactEmailFieldName(),
    includeLinked ? 'all' : 'unlinked',
  ]
}

export async function listLinkedOdooPartnerIds(): Promise<number[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('client_integrations')
    .select('odoo_partner_id')
    .not('odoo_partner_id', 'is', null)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? [])
    .map((row) => row.odoo_partner_id)
    .filter((id): id is number => typeof id === 'number' && id > 0)
}

/** Más que los contactos de Odoo (952 a 2026-10-23); un tope bajo deja fuera el final del alfabeto. */
const ODOO_PARTNER_CATALOG_LIMIT = 3000

async function fetchOdooPartnersForImport(
  linkedIds: number[]
): Promise<OdooPartnerImportOption[]> {
  const contactEmailField = getOdooContactEmailFieldName()
  // Sin nombre no se puede elegir (Odoo crea contactos vacíos desde correos automáticos y,
  // al ordenar por nombre, salen los primeros y se comen el límite).
  const domain: unknown[] = [['name', '!=', false]]
  if (linkedIds.length > 0) {
    domain.push(['id', 'not in', linkedIds])
  }

  const rows = await odooSearchRead<OdooPartnerRow>('res.partner', {
    domain,
    fields: ['name', 'email', 'phone', 'is_company', contactEmailField],
    order: 'name asc',
    limit: ODOO_PARTNER_CATALOG_LIMIT,
  })

  return rows.map((row) =>
    mapOdooPartnerRowToImportOption(row, contactEmailField)
  )
}

async function loadOdooPartnerCatalog(
  includeLinked: boolean
): Promise<OdooPartnerImportOption[]> {
  const linkedIds = includeLinked ? [] : await listLinkedOdooPartnerIds()
  return fetchOdooPartnersForImport(linkedIds)
}

export async function getOdooPartnerCatalog(options?: {
  /** Si true, no excluye contactos que ya son clientes en el portal. */
  includeLinked?: boolean
}): Promise<OdooPartnerImportOption[]> {
  const includeLinked = options?.includeLinked ?? false
  const ttl = getOdooPartnerCatalogTtlSeconds()

  const cached = unstable_cache(
    () => loadOdooPartnerCatalog(includeLinked),
    getOdooPartnerCatalogCacheKey(includeLinked),
    {
      revalidate: ttl,
      tags: [ODOO_PARTNER_CATALOG_CACHE_TAG],
    }
  )

  return cached()
}
