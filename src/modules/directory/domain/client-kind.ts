import type { ClientKind } from '@/src/modules/directory/domain/types'
import type { ProfileRow } from '@/src/modules/directory/domain/map-directory-row'

export function isProfileCompanyKind(profile: ProfileRow): boolean {
  const companyName = profile.company_name?.trim()
  const hasPersonName =
    Boolean(profile.first_name?.trim()) || Boolean(profile.first_surname?.trim())
  return Boolean(companyName) && !hasPersonName
}

export function inferClientKindFromProfile(
  profile: ProfileRow | undefined
): ClientKind {
  if (!profile) return 'person'
  return isProfileCompanyKind(profile) ? 'company' : 'person'
}

export function mapClientProfileFields(input: {
  clientKind: ClientKind
  firstName?: string
  firstSurname?: string
  secondSurname?: string
  companyName?: string
}) {
  if (input.clientKind === 'company') {
    return {
      first_name: '',
      first_surname: '',
      second_surname: '',
      company_name: input.companyName?.trim() || null,
    }
  }

  return {
    first_name: input.firstName?.trim() ?? '',
    first_surname: input.firstSurname?.trim() ?? '',
    second_surname: input.secondSurname?.trim() ?? '',
    company_name: input.companyName?.trim() || null,
  }
}

export function parseClientKind(value: string | null | undefined): ClientKind {
  return value === 'company' ? 'company' : 'person'
}
