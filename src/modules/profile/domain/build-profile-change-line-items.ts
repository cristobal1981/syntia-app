import { profile } from '@/content/profile'
import { normalizeIban } from '@/lib/profile/validate-profile-change'
import type {
  ClientProfile,
  FiscalAddress,
  ProfileChangeLineItem,
} from '@/src/modules/profile/domain/types'

const labels = profile.ticketChangeLabels

function pushIfChanged(
  items: ProfileChangeLineItem[],
  label: string,
  currentValue: string,
  requestedValue: string,
  normalize?: (value: string) => string
) {
  const current = normalize ? normalize(currentValue) : currentValue.trim()
  const requested = normalize ? normalize(requestedValue) : requestedValue.trim()

  if (current === requested) {
    return
  }

  items.push({
    label,
    currentValue: currentValue.trim() || '—',
    requestedValue: requestedValue.trim(),
  })
}

function compareAddressFields(
  items: ProfileChangeLineItem[],
  current: FiscalAddress,
  requested: FiscalAddress
) {
  const fields: Array<{ key: keyof FiscalAddress; label: string }> = [
    { key: 'line1', label: labels.addressLine1 },
    { key: 'line2', label: labels.addressLine2 },
    { key: 'postalCode', label: labels.postalCode },
    { key: 'city', label: labels.city },
    { key: 'province', label: labels.province },
    { key: 'country', label: labels.country },
  ]

  for (const { key, label } of fields) {
    pushIfChanged(items, label, current[key], requested[key])
  }
}

export function buildProfileChangeLineItems(
  current: ClientProfile,
  requested: {
    name: string
    email: string
    phone: string
    taxId: string
    iban: string
    address: FiscalAddress
  }
): ProfileChangeLineItem[] {
  const items: ProfileChangeLineItem[] = []

  pushIfChanged(items, labels.name, current.name, requested.name)
  pushIfChanged(items, labels.email, current.email, requested.email)
  pushIfChanged(items, labels.phone, current.phone, requested.phone)
  pushIfChanged(items, labels.taxId, current.taxId, requested.taxId, (value) =>
    value.trim().toUpperCase()
  )
  pushIfChanged(items, labels.iban, current.iban, requested.iban, normalizeIban)
  compareAddressFields(items, current.address, requested.address)

  return items
}
