import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

type ResStateRow = { id: number; name?: string }

const stateIdCache = new Map<string, number>()

function parsePositiveInt(value: string): number | null {
  // Solo dígitos: parseInt aceptaría "28001 Madrid" como 28001.
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const parsed = Number(trimmed)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

export async function resolveOdooStateId(
  provinceValue: string,
  countryId: number
): Promise<number> {
  const asId = parsePositiveInt(provinceValue)
  if (asId) {
    stateIdCache.set(`${countryId}:${asId}`, asId)
    return asId
  }

  const cacheKey = `${countryId}:${provinceValue.trim().toLowerCase()}`
  const cached = stateIdCache.get(cacheKey)
  if (cached) return cached

  const rows = await odooSearchRead<ResStateRow>('res.country.state', {
    domain: [
      ['country_id', '=', countryId],
      ['name', 'ilike', provinceValue.trim()],
    ],
    fields: ['id', 'name'],
    limit: 1,
  })

  const id = rows[0]?.id
  if (typeof id === 'number' && id > 0) {
    stateIdCache.set(cacheKey, id)
    return id
  }

  throw new Error('ODOO_STATE_NOT_FOUND')
}
