import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

import { resolveOdooCountryId } from '@/src/modules/onboarding/resolve-odoo-country-id'

export type OnboardingCountryOption = {
  id: number
  code: string
  name: string
}

export type OnboardingProvinceOption = {
  id: number
  name: string
  countryId: number
}

export type OnboardingAddressCatalog = {
  countries: OnboardingCountryOption[]
  provinces: OnboardingProvinceOption[]
  defaultCountryId: number
}

type ResCountryRow = { id: number; code?: string; name?: string }
type ResStateRow = { id: number; name?: string; country_id?: [number, string] | number }

const CATALOG_TTL_MS = 60 * 60 * 1000

let cachedCatalog: { expiresAt: number; data: OnboardingAddressCatalog } | null = null

export async function getOnboardingAddressCatalog(): Promise<OnboardingAddressCatalog> {
  if (cachedCatalog && cachedCatalog.expiresAt > Date.now()) {
    return cachedCatalog.data
  }

  const spainCountryId = await resolveOdooCountryId('ES')

  const [countries, states] = await Promise.all([
    odooSearchRead<ResCountryRow>('res.country', {
      fields: ['id', 'code', 'name'],
      order: 'name asc',
      limit: 300,
    }),
    odooSearchRead<ResStateRow>('res.country.state', {
      domain: [['country_id', '=', spainCountryId]],
      fields: ['id', 'name', 'country_id'],
      order: 'name asc',
      limit: 100,
    }),
  ])

  const countryOptions: OnboardingCountryOption[] = countries
    .filter((row) => typeof row.id === 'number' && row.id > 0)
    .map((row) => ({
      id: row.id,
      code: row.code?.trim() || '',
      name: row.name?.trim() || '',
    }))
    .filter((row) => row.name.length > 0)

  const provinces: OnboardingProvinceOption[] = states
    .filter((row) => typeof row.id === 'number' && row.id > 0)
    .map((row) => ({
      id: row.id,
      name: row.name?.trim() || '',
      countryId: spainCountryId,
    }))
    .filter((row) => row.name.length > 0)

  countryOptions.sort((a, b) => {
    if (a.id === spainCountryId) return -1
    if (b.id === spainCountryId) return 1
    return a.name.localeCompare(b.name, 'es')
  })

  const data: OnboardingAddressCatalog = {
    countries: countryOptions,
    provinces,
    defaultCountryId: spainCountryId,
  }

  cachedCatalog = { expiresAt: Date.now() + CATALOG_TTL_MS, data }
  return data
}
