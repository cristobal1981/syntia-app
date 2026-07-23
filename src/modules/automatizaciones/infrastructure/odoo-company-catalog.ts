import { unstable_cache } from 'next/cache'

import type { OdooCompanyOption } from '@/src/modules/automatizaciones/domain/odoo-company-option'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

export const ODOO_COMPANY_CATALOG_CACHE_TAG = 'odoo-company-catalog'
const DEFAULT_CATALOG_TTL_SECONDS = 600
const COMPANY_FETCH_LIMIT = 2000

type OdooCompanyRow = {
  id: number
  name?: string | false | null
}

function getCatalogTtlSeconds(): number {
  const raw = process.env.ODOO_COMPANY_CATALOG_TTL_SECONDS?.trim()
  if (!raw) return DEFAULT_CATALOG_TTL_SECONDS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CATALOG_TTL_SECONDS
  return parsed
}

function mapOdooCompanyRow(row: OdooCompanyRow): OdooCompanyOption | null {
  if (!row.id || row.id <= 0) return null
  const name =
    typeof row.name === 'string' && row.name.trim() ? row.name.trim() : 'Sin nombre'
  return { id: row.id, name }
}

async function fetchOdooCompanies(): Promise<OdooCompanyOption[]> {
  const rows = await odooSearchRead<OdooCompanyRow>('res.partner', {
    domain: [['parent_id', '=', false]],
    fields: ['name'],
    order: 'name asc',
    limit: COMPANY_FETCH_LIMIT,
  })

  return rows
    .map(mapOdooCompanyRow)
    .filter((company): company is OdooCompanyOption => company !== null)
}

export async function getOdooCompanyCatalog(): Promise<OdooCompanyOption[]> {
  const ttl = getCatalogTtlSeconds()

  const cached = unstable_cache(
    fetchOdooCompanies,
    [ODOO_COMPANY_CATALOG_CACHE_TAG],
    {
      revalidate: ttl,
      tags: [ODOO_COMPANY_CATALOG_CACHE_TAG],
    }
  )

  return cached()
}
