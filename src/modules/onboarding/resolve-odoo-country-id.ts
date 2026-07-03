import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

type ResCountryRow = { id: number; code?: string; name?: string }

const countryIdCache = new Map<string, number>()

/** Nombre o alias habitual → código ISO 3166-1 alpha-2 (res.country.code). */
const COUNTRY_CODE_ALIASES: Record<string, string> = {
  es: 'ES',
  espana: 'ES',
  spain: 'ES',
  pt: 'PT',
  portugal: 'PT',
  fr: 'FR',
  francia: 'FR',
  france: 'FR',
  de: 'DE',
  alemania: 'DE',
  germany: 'DE',
  it: 'IT',
  italia: 'IT',
  italy: 'IT',
  gb: 'GB',
  uk: 'GB',
  'reino unido': 'GB',
  'united kingdom': 'GB',
  us: 'US',
  usa: 'US',
  'estados unidos': 'US',
  'united states': 'US',
}

function normalizeCountryKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function resolveIsoCode(label: string): string | null {
  const trimmed = label.trim()
  if (!trimmed) return null

  if (/^[a-zA-Z]{2}$/.test(trimmed)) {
    return trimmed.toUpperCase()
  }

  const alias = COUNTRY_CODE_ALIASES[normalizeCountryKey(trimmed)]
  return alias ?? null
}

export async function resolveOdooCountryId(countryLabel: string): Promise<number> {
  const trimmed = countryLabel.trim()
  const asId = Number.parseInt(trimmed, 10)
  if (Number.isInteger(asId) && asId > 0) {
    countryIdCache.set(trimmed, asId)
    return asId
  }

  const cacheKey = normalizeCountryKey(countryLabel)
  const cached = countryIdCache.get(cacheKey)
  if (cached) return cached

  const isoCode = resolveIsoCode(countryLabel)
  if (isoCode) {
    const byCode = await odooSearchRead<ResCountryRow>('res.country', {
      domain: [['code', '=', isoCode]],
      fields: ['id', 'code', 'name'],
      limit: 1,
    })
    const id = byCode[0]?.id
    if (typeof id === 'number' && id > 0) {
      countryIdCache.set(cacheKey, id)
      countryIdCache.set(isoCode.toLowerCase(), id)
      return id
    }
  }

  const byName = await odooSearchRead<ResCountryRow>('res.country', {
    domain: [['name', 'ilike', countryLabel.trim()]],
    fields: ['id', 'code', 'name'],
    limit: 1,
  })
  const id = byName[0]?.id
  if (typeof id === 'number' && id > 0) {
    countryIdCache.set(cacheKey, id)
    return id
  }

  throw new Error('ODOO_COUNTRY_NOT_FOUND')
}
