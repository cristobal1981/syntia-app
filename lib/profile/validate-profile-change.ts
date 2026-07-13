import { profile } from '@/content/profile'
import {
  isValidEmail,
  isValidPhone,
  isValidSpanishIban,
  isValidSpanishPostalCode,
  isValidVat,
  normalizeIban,
  trim,
} from '@/lib/validation'
import type {
  ClientProfile,
  FiscalAddress,
  ProfileFieldKey,
} from '@/src/modules/profile/domain/types'

export {
  isValidEmail as isLikelyValidEmail,
  isValidPhone as isLikelyValidPhone,
  isValidVat as isLikelyValidVat,
  isValidSpanishIban as isLikelyValidIban,
  normalizeIban,
  maskIban,
} from '@/lib/validation'

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

export type ProfileChangeInput = {
  selectedFields: ProfileFieldKey[]
  name: string
  email: string
  phone: string
  address: FiscalAddress
  vat: string
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

  if (input.vat.trim().toUpperCase() !== current.vat.trim().toUpperCase()) {
    fields.push('vat')
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

  if (input.selectedFields.includes('name') && !trim(input.name)) {
    errors.name = profile.errors.name
  }

  if (input.selectedFields.includes('email')) {
    if (!isValidEmail(input.email)) {
      errors.email = profile.errors.email
    }
  }

  if (input.selectedFields.includes('phone') && !isValidPhone(input.phone)) {
    errors.phone = profile.errors.phone
  }

  if (input.selectedFields.includes('vat')) {
    if (!isValidVat(input.vat)) {
      errors.vat = profile.errors.vat
    }
  }

  if (input.selectedFields.includes('iban')) {
    if (!isValidSpanishIban(input.iban)) {
      errors.iban = profile.errors.iban
    }
  }

  if (input.selectedFields.includes('address')) {
    if (!trim(input.address.line1)) {
      errors.addressLine1 = profile.errors.addressLine1
    }
    if (!isValidSpanishPostalCode(input.address.postalCode)) {
      errors.postalCode = profile.errors.postalCode
    }
    if (!trim(input.address.city)) {
      errors.city = profile.errors.city
    }
    if (!trim(input.address.province)) {
      errors.province = profile.errors.province
    }
    if (!trim(input.address.country)) {
      errors.country = profile.errors.country
    }
  }

  return errors
}
