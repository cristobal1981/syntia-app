import { profile } from '@/content/profile'
import type { ProfileChangeErrorCode } from '@/src/modules/profile/domain/types'

type PostalLookupResponse = {
  places?: Array<{
    'place name'?: string
    state?: string
  }>
}

const PROFILE_CHANGE_ERROR_KEYS = [
  'unauthorized',
  'forbidden',
  'not_linked',
  'odoo_unavailable',
  'create_failed',
  'unknown',
] as const satisfies readonly ProfileChangeErrorCode[]

export function mapProfileChangeError(error: ProfileChangeErrorCode): string {
  if (error === 'validation') {
    return profile.errors.unknown
  }
  if ((PROFILE_CHANGE_ERROR_KEYS as readonly string[]).includes(error)) {
    return profile.errors[error as (typeof PROFILE_CHANGE_ERROR_KEYS)[number]]
  }
  return profile.errors.unknown
}

export async function lookupPostalCode(postalCode: string) {
  if (!/^[0-9]{5}$/.test(postalCode)) return null

  try {
    const response = await fetch(`https://api.zippopotam.us/es/${postalCode}`)
    if (!response.ok) return null

    const data = (await response.json()) as PostalLookupResponse
    const place = data.places?.[0]
    if (!place) return null

    return {
      city: place['place name'] ?? '',
      province: place.state ?? '',
    }
  } catch {
    return null
  }
}
