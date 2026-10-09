import { isValidEmail } from '@/lib/validation/email'
import type { ClientKind } from '@/src/modules/directory/domain/types'

export function validatePersonFirstName(value: string): string | undefined {
  if (!value.trim()) return 'El nombre es obligatorio.'
  if (value.trim().length < 2) {
    return 'El nombre debe tener al menos 2 caracteres.'
  }
  return undefined
}

export function validatePersonFirstSurname(value: string): string | undefined {
  if (!value.trim()) return 'El primer apellido es obligatorio.'
  if (value.trim().length < 2) {
    return 'El primer apellido debe tener al menos 2 caracteres.'
  }
  return undefined
}

export function validatePersonSecondSurname(value: string): string | undefined {
  if (!value.trim()) return undefined
  if (value.trim().length < 2) {
    return 'El segundo apellido debe tener al menos 2 caracteres.'
  }
  return undefined
}

export function validatePersonNameParts(parts: {
  firstName: string
  firstSurname: string
  secondSurname?: string
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {}
  const firstNameError = validatePersonFirstName(parts.firstName)
  const firstSurnameError = validatePersonFirstSurname(parts.firstSurname)
  const secondSurnameError = validatePersonSecondSurname(
    parts.secondSurname ?? ''
  )
  if (firstNameError) fieldErrors.firstName = firstNameError
  if (firstSurnameError) fieldErrors.firstSurname = firstSurnameError
  if (secondSurnameError) fieldErrors.secondSurname = secondSurnameError
  return fieldErrors
}

export function validatePersonEmail(email: string): string | undefined {
  if (!email.trim()) return 'El correo es obligatorio.'
  if (!isValidEmail(email)) return 'Introduce un correo válido.'
  return undefined
}

export function validateOdooPartnerId(value: string): string | undefined {
  if (!value.trim()) return undefined
  if (!/^[0-9]+$/.test(value.trim())) {
    return 'El ID de Odoo debe ser numérico.'
  }
  return undefined
}

const DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{10,128}$/
const DRIVE_URL_HOSTS = new Set(['drive.google.com'])

/**
 * Solo se aceptan URLs de drive.google.com. Con varios segmentos `/folders/` se
 * toma el último (la carpeta más interna) y solo se mira la ruta, nunca el query.
 */
function extractDriveFolderIdFromUrl(value: string): string | undefined {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return undefined
  }
  if (url.protocol !== 'https:' || !DRIVE_URL_HOSTS.has(url.hostname) || url.username) {
    return undefined
  }
  const folders = [...url.pathname.matchAll(/\/folders\/([A-Za-z0-9_-]+)/g)]
  const last = folders[folders.length - 1]?.[1]
  if (last) return last
  return url.pathname === '/open' ? (url.searchParams.get('id') ?? undefined) : undefined
}

/** Acepta un ID de carpeta o la URL de Drive pegada por el staff y devuelve solo el ID. */
export function normalizeDriveFolderInput(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (/[/?]/.test(trimmed)) {
    return extractDriveFolderIdFromUrl(trimmed) ?? trimmed
  }
  return trimmed
}

export function validateDriveFolderId(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (!DRIVE_FOLDER_ID_PATTERN.test(trimmed)) {
    return 'El ID de carpeta de Drive no es válido. Pega el ID o la URL de la carpeta Pública.'
  }
  return undefined
}

export function validateCompanyName(value: string): string | undefined {
  if (!value.trim()) return 'La razón social es obligatoria.'
  if (value.trim().length < 2) {
    return 'La razón social debe tener al menos 2 caracteres.'
  }
  return undefined
}

export function validateClientForm(input: {
  clientKind: ClientKind
  firstName: string
  firstSurname: string
  secondSurname?: string
  companyName?: string
  email: string
  odooPartnerId?: string
  driveFolderId?: string
}): Record<string, string> {
  const fieldErrors: Record<string, string> = {}

  if (input.clientKind === 'company') {
    const companyError = validateCompanyName(input.companyName ?? '')
    if (companyError) fieldErrors.companyName = companyError
  } else {
    Object.assign(fieldErrors, validatePersonNameParts(input))
  }

  const emailError = validatePersonEmail(input.email)
  if (emailError) fieldErrors.email = emailError

  const odooError = validateOdooPartnerId(input.odooPartnerId ?? '')
  if (odooError) fieldErrors.odooPartnerId = odooError

  const driveError = validateDriveFolderId(input.driveFolderId ?? '')
  if (driveError) fieldErrors.driveFolderId = driveError

  return fieldErrors
}
