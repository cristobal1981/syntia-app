import type { ClientKind } from '@/src/modules/directory/domain/types'

export type OdooPartnerImportOption = {
  id: number
  label: string
  corporateEmail?: string
  contactEmail?: string
  phone?: string
  vat?: string
  odooPartnerId: string
  driveFolderId?: string
  driveFolderParseFailed?: boolean
  odooIsCompany?: boolean
}

export type OdooNameSplitMode = 'given-first' | 'surname-first' | 'comma'

export type OdooNameFields = {
  firstName: string
  firstSurname: string
  secondSurname?: string
  companyName?: string
}

export type OdooPartnerRow = {
  id: number
  name: string
  email?: string | false | null
  phone?: string | false | null
  vat?: string | false | null
  is_company?: boolean | null
  [key: string]: unknown
}

export function parseGoogleDriveParentFolderId(url: string): string | undefined {
  const trimmed = url.trim()
  if (!trimmed) return undefined

  const foldersMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/)
  if (foldersMatch?.[1]) return foldersMatch[1]

  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idParamMatch?.[1]) return idParamMatch[1]

  return undefined
}

/** @deprecated Usa parseGoogleDriveParentFolderId */
export function parseGoogleDriveFolderId(url: string): string | undefined {
  return parseGoogleDriveParentFolderId(url)
}

function sanitizeOdooString(value: string | false | null | undefined): string | undefined {
  if (value === false || value == null) return undefined
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

/** Compat: catálogo cacheado antiguo exponía `email` en lugar de corporate/contact. */
export function resolveOdooPartnerEmails(partner: OdooPartnerImportOption): {
  corporateEmail?: string
  contactEmail?: string
} {
  const legacyEmail = (partner as OdooPartnerImportOption & { email?: string })
    .email
  return {
    corporateEmail: partner.corporateEmail ?? legacyEmail,
    contactEmail: partner.contactEmail,
  }
}

/** Correo para el portal: el campo de nóminas/comunicaciones gana sobre el corporativo (noreply). */
export function resolvePortalEmailFromOdoo(
  contactEmail?: string,
  corporateEmail?: string
): string {
  return contactEmail ?? corporateEmail ?? ''
}

export function resolvePortalEmailFromOdooPartner(
  partner: OdooPartnerImportOption
): string {
  const { contactEmail, corporateEmail } = resolveOdooPartnerEmails(partner)
  return resolvePortalEmailFromOdoo(contactEmail, corporateEmail)
}

function splitGivenFirst(name: string): OdooNameFields {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) {
    return { firstName: 'Sin nombre', firstSurname: 'Sin nombre' }
  }
  if (parts.length === 1) {
    return { firstName: parts[0], firstSurname: parts[0] }
  }
  if (parts.length === 2) {
    return { firstName: parts[0], firstSurname: parts[1] }
  }
  if (parts.length === 3) {
    return {
      firstName: parts[0],
      firstSurname: parts[1],
      secondSurname: parts[2],
    }
  }
  return {
    firstName: parts.slice(0, -2).join(' '),
    firstSurname: parts[parts.length - 2],
    secondSurname: parts[parts.length - 1],
  }
}

function splitSurnameFirst(name: string): OdooNameFields {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) {
    return { firstName: 'Sin nombre', firstSurname: 'Sin nombre' }
  }
  if (parts.length === 1) {
    return { firstName: parts[0], firstSurname: parts[0] }
  }
  if (parts.length === 2) {
    return { firstName: parts[1], firstSurname: parts[0] }
  }
  if (parts.length === 3) {
    return {
      firstName: parts[2],
      firstSurname: parts[0],
      secondSurname: parts[1],
    }
  }
  return {
    firstName: parts.slice(2).join(' '),
    firstSurname: parts[0],
    secondSurname: parts[1],
  }
}

function splitCommaSeparated(name: string): OdooNameFields {
  const commaIndex = name.indexOf(',')
  if (commaIndex === -1) {
    return splitGivenFirst(name)
  }

  const surnamePart = name.slice(0, commaIndex).trim()
  const givenPart = name.slice(commaIndex + 1).trim()
  if (!givenPart) {
    return splitGivenFirst(name)
  }

  const surnameTokens = surnamePart.split(/\s+/).filter(Boolean)
  if (!surnameTokens.length) {
    return { firstName: givenPart, firstSurname: givenPart }
  }
  if (surnameTokens.length === 1) {
    return { firstName: givenPart, firstSurname: surnameTokens[0] }
  }

  return {
    firstName: givenPart,
    firstSurname: surnameTokens[0],
    secondSurname: surnameTokens.slice(1).join(' '),
  }
}

export function splitOdooLabelToNameFields(
  label: string,
  mode: OdooNameSplitMode
): OdooNameFields {
  const trimmed = label.trim()
  switch (mode) {
    case 'surname-first':
      return splitSurnameFirst(trimmed)
    case 'comma':
      return splitCommaSeparated(trimmed)
    case 'given-first':
    default:
      return splitGivenFirst(trimmed)
  }
}

export function detectDefaultClientKind(odooIsCompany?: boolean): ClientKind {
  return odooIsCompany ? 'company' : 'person'
}

export function detectDefaultOdooNameSplitMode(label: string): OdooNameSplitMode {
  if (label.includes(',')) return 'comma'
  return 'given-first'
}

export function mapOdooPartnerRowToImportOption(
  row: OdooPartnerRow,
  driveFieldName: string,
  contactEmailFieldName: string,
  publicDriveFolderId?: string
): OdooPartnerImportOption {
  const name = sanitizeOdooString(row.name) ?? 'Sin nombre'
  const corporateEmail = sanitizeOdooString(row.email)
  const contactEmail = sanitizeOdooString(
    row[contactEmailFieldName] as string | undefined
  )
  const phone = sanitizeOdooString(row.phone)
  const vat = sanitizeOdooString(row.vat)
  const driveUrl = sanitizeOdooString(row[driveFieldName] as string | undefined)
  const parentFolderId = driveUrl
    ? parseGoogleDriveParentFolderId(driveUrl)
    : undefined

  return {
    id: row.id,
    label: name,
    corporateEmail,
    contactEmail,
    phone,
    vat,
    odooPartnerId: String(row.id),
    driveFolderId: publicDriveFolderId,
    driveFolderParseFailed: Boolean(parentFolderId && !publicDriveFolderId),
    odooIsCompany: Boolean(row.is_company),
  }
}

export function buildImportDraftFromOdooPartner(
  partner: OdooPartnerImportOption,
  clientKind: ClientKind,
  nameSplitMode: OdooNameSplitMode = 'given-first'
) {
  const { contactEmail, corporateEmail } = resolveOdooPartnerEmails(partner)
  const email = resolvePortalEmailFromOdoo(contactEmail, corporateEmail)

  if (clientKind === 'company') {
    return {
      clientKind: 'company' as const,
      companyName: partner.label,
      firstName: '',
      firstSurname: '',
      secondSurname: undefined,
      email,
      corporateEmail,
      contactEmail,
      phone: partner.phone,
      vat: partner.vat,
      odooPartnerId: partner.odooPartnerId,
      driveFolderId: partner.driveFolderId,
    }
  }

  const nameFields = splitOdooLabelToNameFields(partner.label, nameSplitMode)

  return {
    clientKind: 'person' as const,
    firstName: nameFields.firstName,
    firstSurname: nameFields.firstSurname,
    secondSurname: nameFields.secondSurname,
    companyName: nameFields.companyName,
    email,
    corporateEmail,
    contactEmail,
    phone: partner.phone,
    vat: partner.vat,
    odooPartnerId: partner.odooPartnerId,
    driveFolderId: partner.driveFolderId,
  }
}
