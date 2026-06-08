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
  taxId: string
  iban: string
}

export type ProfileFieldKey =
  | 'name'
  | 'email'
  | 'phone'
  | 'address'
  | 'taxId'
  | 'iban'

export type ProfileFieldChange = {
  field: ProfileFieldKey
  label: string
  currentValue: string
  requestedValue: string
}

export type ProfileChangePayload = {
  ticketTitle: string
  clientId: string
  clientName: string
  clientEmail: string
  changes: ProfileFieldChange[]
  requestedAt: string
}

export type ProfileChangeFormState =
  | { ok: true }
  | { ok: false; error: 'unauthorized' | 'forbidden' | 'validation' | 'unknown'; fieldErrors?: Record<string, string> }
