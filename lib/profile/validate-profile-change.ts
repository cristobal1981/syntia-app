import { profile } from '@/content/profile'
import type {
  ClientProfile,
  FiscalAddress,
  ProfileFieldKey,
} from '@/src/modules/profile/domain/types'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE = /^\+?[0-9][0-9\s\-().]{7,}$/
const POSTAL_CODE_RE = /^[0-9]{5}$/
const NIF_RE = /^[0-9]{8}[A-Z]$/
const NIE_RE = /^[XYZ][0-9]{7}[A-Z]$/
const CIF_RE = /^[ABCDEFGHJNPQRSUVW][0-9]{7}[0-9A-J]$/

export function isLikelyValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function isLikelyValidPhone(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return true
  return PHONE_RE.test(trimmed)
}

export function isLikelyValidTaxId(value: string): boolean {
  const normalized = value.trim().toUpperCase().replace(/\s/g, '')
  return NIF_RE.test(normalized) || NIE_RE.test(normalized) || CIF_RE.test(normalized)
}

export function normalizeIban(value: string): string {
  return value.replace(/\s/g, '').toUpperCase()
}

export function isLikelyValidIban(value: string): boolean {
  const iban = normalizeIban(value)
  if (!/^ES[0-9]{22}$/.test(iban)) return false

  const rearranged = iban.slice(4) + iban.slice(0, 4)
  const numeric = rearranged
    .split('')
    .map((char) => {
      const code = char.charCodeAt(0)
      if (code >= 65 && code <= 90) return String(code - 55)
      return char
    })
    .join('')

  let remainder = 0
  for (const digit of numeric) {
    remainder = (remainder * 10 + Number(digit)) % 97
  }

  return remainder === 1
}

export function formatAddress(address: FiscalAddress): string {
  const parts = [
    address.line1,
    address.line2,
    `${address.postalCode} ${address.city}`,
    address.province,
    address.country,
  ].filter(Boolean)

  return parts.join(', ')
}

export function maskIban(iban: string): string {
  const normalized = normalizeIban(iban)
  if (normalized.length < 8) return iban
  const visible = normalized.slice(-4)
  return `${normalized.slice(0, 2)}** **** **** **** ${visible}`
}

export type ProfileChangeInput = {
  selectedFields: ProfileFieldKey[]
  name: string
  email: string
  phone: string
  address: FiscalAddress
  taxId: string
  iban: string
}

function normalizeAddress(address: FiscalAddress): FiscalAddress {
  return {
    line1: address.line1.trim(),
    line2: address.line2.trim(),
    postalCode: address.postalCode.trim(),
    city: address.city.trim(),
    province: address.province.trim(),
    country: address.country.trim() || 'España',
  }
}

function addressesEqual(left: FiscalAddress, right: FiscalAddress): boolean {
  const a = normalizeAddress(left)
  const b = normalizeAddress(right)

  return (
    a.line1 === b.line1 &&
    a.line2 === b.line2 &&
    a.postalCode === b.postalCode &&
    a.city === b.city &&
    a.province === b.province &&
    a.country === b.country
  )
}

export function detectChangedFields(
  current: ClientProfile,
  input: Omit<ProfileChangeInput, 'selectedFields'>
): ProfileFieldKey[] {
  const fields: ProfileFieldKey[] = []

  if (input.name.trim() !== current.name.trim()) {
    fields.push('name')
  }

  if (input.email.trim() !== current.email.trim()) {
    fields.push('email')
  }

  if (input.phone.trim() !== current.phone.trim()) {
    fields.push('phone')
  }

  if (!addressesEqual(input.address, current.address)) {
    fields.push('address')
  }

  if (input.taxId.trim().toUpperCase() !== current.taxId.trim().toUpperCase()) {
    fields.push('taxId')
  }

  if (normalizeIban(input.iban) !== normalizeIban(current.iban)) {
    fields.push('iban')
  }

  return fields
}

export function validateProfileChangeInput(
  input: ProfileChangeInput
): Record<string, string> {
  const errors: Record<string, string> = {}

  if (input.selectedFields.length === 0) {
    errors._form = profile.errors.no_changes
    return errors
  }

  if (input.selectedFields.includes('name') && !input.name.trim()) {
    errors.name = profile.errors.name
  }

  if (input.selectedFields.includes('email')) {
    if (!isLikelyValidEmail(input.email)) {
      errors.email = profile.errors.email
    }
  }

  if (input.selectedFields.includes('phone') && !isLikelyValidPhone(input.phone)) {
    errors.phone = profile.errors.phone
  }

  if (input.selectedFields.includes('taxId')) {
    if (!isLikelyValidTaxId(input.taxId)) {
      errors.taxId = profile.errors.taxId
    }
  }

  if (input.selectedFields.includes('iban')) {
    if (!isLikelyValidIban(input.iban)) {
      errors.iban = profile.errors.iban
    }
  }

  if (input.selectedFields.includes('address')) {
    if (!input.address.line1.trim()) {
      errors.addressLine1 = profile.errors.addressLine1
    }
    if (!POSTAL_CODE_RE.test(input.address.postalCode.trim())) {
      errors.postalCode = profile.errors.postalCode
    }
    if (!input.address.city.trim()) {
      errors.city = profile.errors.city
    }
    if (!input.address.province.trim()) {
      errors.province = profile.errors.province
    }
    if (!input.address.country.trim()) {
      errors.country = profile.errors.country
    }
  }

  return errors
}
