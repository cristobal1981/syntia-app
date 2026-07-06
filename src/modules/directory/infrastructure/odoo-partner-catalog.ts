import { unstable_cache } from 'next/cache'

import {
  mapOdooPartnerRowToImportOption,
  parseGoogleDriveParentFolderId,
  type OdooPartnerImportOption,
  type OdooPartnerRow,
} from '@/src/modules/directory/domain/odoo-partner-import'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import {
  getOdooDriveFieldName,
  getOdooContactEmailFieldName,
  getOdooPartnerCatalogTtlSeconds,
  ODOO_PARTNER_CATALOG_CACHE_TAG,
} from '@/src/modules/directory/infrastructure/odoo-partner-env'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { resolvePublicDriveFolderMap } from '@/src/modules/portal/infrastructure/google-drive-public-folder'

function getOdooPartnerCatalogCacheKey(): string[] {
  return [
    ODOO_PARTNER_CATALOG_CACHE_TAG,
    getOdooDriveFieldName(),
    getOdooContactEmailFieldName(),
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

async function fetchOdooPartnersForImport(
  linkedIds: number[]
): Promise<OdooPartnerImportOption[]> {
  const driveField = getOdooDriveFieldName()
  const contactEmailField = getOdooContactEmailFieldName()
  const domain: unknown[] = [[driveField, '!=', false]]
  if (linkedIds.length > 0) {
    domain.push(['id', 'not in', linkedIds])
  }

  const rows = await odooSearchRead<OdooPartnerRow>('res.partner', {
    domain,
    fields: [
      'name',
      'email',
      'phone',
      'vat',
      'is_company',
      driveField,
      contactEmailField,
    ],
    order: 'name asc',
    limit: 500,
  })

  const parentFolderByPartnerId = new Map<number, string>()
  const parentFolderIds: string[] = []

  for (const row of rows) {
    const driveUrl = row[driveField]
    if (typeof driveUrl !== 'string' || !driveUrl.trim()) continue
    const parentId = parseGoogleDriveParentFolderId(driveUrl)
    if (!parentId) continue
    parentFolderByPartnerId.set(row.id, parentId)
    parentFolderIds.push(parentId)
  }

  const publicFolderByParentId = await resolvePublicDriveFolderMap(parentFolderIds)

  return rows.map((row) =>
    mapOdooPartnerRowToImportOption(
      row,
      driveField,
      contactEmailField,
      publicFolderByParentId.get(parentFolderByPartnerId.get(row.id) ?? '')
    )
  )
}

async function loadOdooPartnerCatalog(): Promise<OdooPartnerImportOption[]> {
  const linkedIds = await listLinkedOdooPartnerIds()
  return fetchOdooPartnersForImport(linkedIds)
}

export async function getOdooPartnerCatalog(): Promise<OdooPartnerImportOption[]> {
  const ttl = getOdooPartnerCatalogTtlSeconds()

  const cached = unstable_cache(loadOdooPartnerCatalog, getOdooPartnerCatalogCacheKey(), {
    revalidate: ttl,
    tags: [ODOO_PARTNER_CATALOG_CACHE_TAG],
  })

  return cached()
}
