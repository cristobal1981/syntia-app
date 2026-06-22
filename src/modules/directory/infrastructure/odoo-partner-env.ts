const DEFAULT_DRIVE_FIELD = 'x_studio_google_drive'
const DEFAULT_CONTACT_EMAIL_FIELD = 'x_studio_email_recepcion_nominas'
const DEFAULT_CATALOG_TTL_SECONDS = 600

export function getOdooDriveFieldName(): string {
  return process.env.ODOO_PARTNER_DRIVE_FIELD?.trim() || DEFAULT_DRIVE_FIELD
}

export function getOdooContactEmailFieldName(): string {
  return (
    process.env.ODOO_PARTNER_CONTACT_EMAIL_FIELD?.trim() ||
    DEFAULT_CONTACT_EMAIL_FIELD
  )
}

export function getOdooPartnerCatalogTtlSeconds(): number {
  const raw = process.env.ODOO_PARTNER_CATALOG_TTL_SECONDS?.trim()
  if (!raw) return DEFAULT_CATALOG_TTL_SECONDS
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CATALOG_TTL_SECONDS
  return parsed
}

export const ODOO_PARTNER_CATALOG_CACHE_TAG = 'odoo-partner-catalog'
