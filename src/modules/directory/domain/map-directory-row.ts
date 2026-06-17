import type { PortalRole } from '@/src/modules/auth/domain/types'
import type {
  ClientRecord,
  GestorRecord,
  PersonStatus,
} from '@/src/modules/directory/domain/types'

const GESTOR_ROLES = new Set<PortalRole>(['advisor', 'admin'])
const CLIENT_ROLES = new Set<PortalRole>(['client'])

/** Tabla portal `profiles` (snake_case en Supabase). */
export type ProfileRow = {
  user_id: string
  first_name: string
  first_surname: string
  second_surname: string
  phone: string | null
  company_name: string | null
  advisor_id: string | null
  odoo_partner_id: number | null
  tax_id: string | null
  iban: string | null
  address_line1: string | null
  address_line2: string | null
  postal_code: string | null
  city: string | null
  province: string | null
  country: string | null
  drive_folder_id: string | null
}

export type UserRow = {
  id: string
  email: string | null
  role: string | null
  status: string | null
  is_active: boolean | null
}

export type DirectoryPersonSource = {
  user: UserRow
  profile?: ProfileRow
}

export const PROFILE_SELECT =
  'user_id, first_name, first_surname, second_surname, phone, company_name, advisor_id, odoo_partner_id, tax_id, iban, address_line1, address_line2, postal_code, city, province, country, drive_folder_id'

export const USER_SELECT = 'id, email, role, status, is_active'

export function mapDbRoleToPortal(role: string | null | undefined): PortalRole | null {
  if (!role) return null
  const normalized = role.toLowerCase()
  if (normalized === 'client' || normalized === 'advisor' || normalized === 'admin') {
    return normalized
  }
  return null
}

export function isGestorDbRole(role: string | null | undefined): boolean {
  const portalRole = mapDbRoleToPortal(role)
  return portalRole !== null && GESTOR_ROLES.has(portalRole)
}

export function isClientDbRole(role: string | null | undefined): boolean {
  const portalRole = mapDbRoleToPortal(role)
  return portalRole !== null && CLIENT_ROLES.has(portalRole)
}

export function mapStatusToPersonStatus(
  status: string | null | undefined
): PersonStatus {
  if (!status) return 'invited'
  return status.toLowerCase() === 'active' ? 'active' : 'invited'
}

export function mapPersonStatusToDb(status: PersonStatus): string {
  return status === 'active' ? 'active' : 'invited'
}

export function sanitizeNullable(value: string | null | undefined): string | undefined {
  if (!value || value === 'null') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

export function buildDisplayName(
  firstName: string | null | undefined,
  firstSurname: string | null | undefined,
  secondSurname?: string | null | undefined
): string {
  const parts = [firstName, firstSurname, secondSurname]
    .map((part) => (part && part !== 'null' ? part.trim() : ''))
    .filter(Boolean)
  return parts.join(' ') || 'Sin nombre'
}

export function mapProfileToNameParts(profile: ProfileRow) {
  return {
    firstName: profile.first_name,
    firstSurname: profile.first_surname,
    secondSurname: sanitizeNullable(profile.second_surname),
  }
}

export function mapNamePartsToProfileFields(parts: {
  firstName: string
  firstSurname: string
  secondSurname?: string
}) {
  return {
    first_name: parts.firstName.trim(),
    first_surname: parts.firstSurname.trim(),
    second_surname: parts.secondSurname?.trim() ?? '',
  }
}

export function formatOdooPartnerId(
  value: number | null | undefined
): string | undefined {
  if (value == null || value <= 0) return undefined
  return String(value)
}

export function parseOdooPartnerId(value: string | undefined): number | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return parsed
}

function resolvePersonFields(source: DirectoryPersonSource) {
  const { user, profile } = source

  const name = profile
    ? buildDisplayName(
        profile.first_name,
        profile.first_surname,
        profile.second_surname
      )
    : user.email ?? 'Sin nombre'

  const nameParts = profile
    ? mapProfileToNameParts(profile)
    : {
        firstName: name,
        firstSurname: '',
        secondSurname: undefined,
      }

  const phone = sanitizeNullable(profile?.phone)
  const companyName = sanitizeNullable(profile?.company_name)
  const email = user.email ?? ''

  return { name, nameParts, phone, companyName, email }
}

function resolvePersonStatus(source: DirectoryPersonSource): PersonStatus {
  return mapStatusToPersonStatus(
    source.user.status ?? (source.user.is_active ? 'active' : undefined)
  )
}

export function mapDirectorySourceToGestor(
  source: DirectoryPersonSource
): GestorRecord | null {
  if (!isGestorDbRole(source.user.role)) return null

  const portalRole = mapDbRoleToPortal(source.user.role)
  if (portalRole !== 'advisor' && portalRole !== 'admin') return null

  const { name, nameParts, phone, companyName, email } = resolvePersonFields(source)

  return {
    id: source.user.id,
    name,
    ...nameParts,
    email,
    role: portalRole,
    companyName,
    phone,
    status: resolvePersonStatus(source),
  }
}

export function mapDirectorySourceToClient(
  source: DirectoryPersonSource,
  advisorName?: string
): ClientRecord | null {
  if (!isClientDbRole(source.user.role)) return null

  const { name, nameParts, phone, companyName, email } = resolvePersonFields(source)

  return {
    id: source.user.id,
    name,
    ...nameParts,
    email,
    phone,
    companyName,
    odooPartnerId: formatOdooPartnerId(source.profile?.odoo_partner_id),
    advisorId: sanitizeNullable(source.profile?.advisor_id ?? undefined),
    advisorName,
    status: resolvePersonStatus(source),
  }
}
