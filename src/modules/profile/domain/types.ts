export type FiscalAddress = {
  line1: string
  line2: string
  postalCode: string
  city: string
  province: string
  country: string
}

export type ClientProfile = {
  id: string
  name: string
  email: string
  phone: string
  address: FiscalAddress
  vat: string
  iban: string
}

export type ProfileFieldKey =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'vat'
  | 'iban'

export type ProfileFieldChange = {
  field: ProfileFieldKey
  label: string
  currentValue: string
  requestedValue: string
}

export type ProfileChangeLineItem = {
  label: string
  currentValue: string
  requestedValue: string
}

export type ProfileChangeErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_linked'
  | 'odoo_unavailable'
  | 'create_failed'
  | 'validation'
  | 'unknown'

export type ProfileChangeResult =
  | { ok: true; ticketId?: number }
  | {
      ok: false
      error: ProfileChangeErrorCode
      fieldErrors?: Record<string, string>
    }

export type ProfileChangeApiResponse = ProfileChangeResult

export type ProfileChangeRequestBody = {
  website?: string
  name: string
  email: string
  phone: string
  vat: string
  iban: string
  address: FiscalAddress
}
