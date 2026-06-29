import { normalizeIban } from '@/lib/validation'
import { resolvePortalEmailFromOdoo } from '@/src/modules/directory/domain/odoo-partner-import'
import {
  formatOdooCountryLabelForDisplay,
  formatOdooStateLabelForDisplay,
  formatOdooVatForDisplay,
} from '@/src/modules/profile/domain/normalize-odoo-profile-display'
import type { ClientProfile, FiscalAddress } from '@/src/modules/profile/domain/types'
import {
  mapOdooMany2OneLabel,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

type OdooMany2One = [number, string] | false | null | undefined

export type OdooPartnerProfileRow = {
  id: number
  name: string
  email?: string | false | null
  phone?: string | false | null
  vat?: string | false | null
  street?: string | false | null
  street2?: string | false | null
  zip?: string | false | null
  city?: string | false | null
  state_id?: OdooMany2One
  country_id?: OdooMany2One
  [key: string]: unknown
}

export type OdooPartnerBankRow = {
  id: number
  acc_number?: string | false | null
  sequence?: number | null
}

function sanitizeOdooString(value: string | false | null | undefined): string {
  if (value === false || value == null) return ''
  if (typeof value !== 'string') return ''
  return value.trim()
}

function mapOdooAddress(row: OdooPartnerProfileRow): FiscalAddress {
  const provinceRaw = mapOdooMany2OneLabel(row.state_id) ?? ''
  const countryRaw = mapOdooMany2OneLabel(row.country_id) ?? ''

  return {
    line1: sanitizeOdooString(row.street),
    line2: sanitizeOdooString(row.street2),
    postalCode: sanitizeOdooString(row.zip),
    city: sanitizeOdooString(row.city),
    province: formatOdooStateLabelForDisplay(provinceRaw),
    country: formatOdooCountryLabelForDisplay(countryRaw),
  }
}

function resolveIbanFromBankRows(rows: OdooPartnerBankRow[]): string {
  const sorted = [...rows].sort((left, right) => {
    const leftSeq = left.sequence ?? 0
    const rightSeq = right.sequence ?? 0
    if (leftSeq !== rightSeq) return leftSeq - rightSeq
    return left.id - right.id
  })

  for (const row of sorted) {
    const accNumber = sanitizeOdooString(row.acc_number)
    if (accNumber) {
      return normalizeIban(accNumber)
    }
  }

  return ''
}

export function mapOdooPartnerToClientProfile(input: {
  clientId: string
  partner: OdooPartnerProfileRow
  contactEmailField: string
  bankRows: OdooPartnerBankRow[]
}): ClientProfile {
  const corporateEmail = sanitizeOdooString(input.partner.email)
  const contactEmail = sanitizeOdooString(
    input.partner[input.contactEmailField] as string | false | null | undefined
  )

  return {
    id: input.clientId,
    name: sanitizeOdooString(input.partner.name) || '—',
    email: resolvePortalEmailFromOdoo(contactEmail || undefined, corporateEmail || undefined),
    phone: sanitizeOdooString(input.partner.phone),
    address: mapOdooAddress(input.partner),
    vat: formatOdooVatForDisplay(sanitizeOdooString(input.partner.vat)),
    iban: resolveIbanFromBankRows(input.bankRows),
  }
}
