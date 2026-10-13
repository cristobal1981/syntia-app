import {
  detectDefaultOdooNameSplitMode,
  splitOdooLabelToNameFields,
  type OdooNameSplitMode,
} from '@/src/modules/directory/domain/odoo-partner-import'

export type OdooUserImportOption = {
  id: number
  label: string
  email?: string
  phone?: string
  odooUserId: string
}

export type OdooUserRow = {
  id: number
  name: string
  login?: string | false | null
  email?: string | false | null
  phone?: string | false | null
}

function sanitizeOdooString(value: string | false | null | undefined): string | undefined {
  if (value === false || value == null) return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

export function mapOdooUserRowToImportOption(row: OdooUserRow): OdooUserImportOption {
  const name = sanitizeOdooString(row.name) ?? 'Sin nombre'
  const email = sanitizeOdooString(row.email) ?? sanitizeOdooString(row.login)
  const phone = sanitizeOdooString(row.phone)

  return {
    id: row.id,
    label: name,
    email,
    phone,
    odooUserId: String(row.id),
  }
}

export function buildImportDraftFromOdooUser(
  user: OdooUserImportOption,
  nameSplitMode: OdooNameSplitMode = 'given-first'
) {
  const nameFields = splitOdooLabelToNameFields(user.label, nameSplitMode)

  return {
    firstName: nameFields.firstName,
    firstSurname: nameFields.firstSurname,
    secondSurname: nameFields.secondSurname,
    email: user.email ?? '',
    phone: user.phone,
    odooUserId: user.odooUserId,
  }
}

export { detectDefaultOdooNameSplitMode }
export type { OdooNameSplitMode }
