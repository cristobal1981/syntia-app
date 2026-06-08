'use server'

import { profile } from '@/content/profile'
import {
  detectChangedFields,
  formatAddress,
  normalizeIban,
  validateProfileChangeInput,
  type ProfileChangeInput,
} from '@/lib/profile/validate-profile-change'
import { getSession } from '@/src/modules/auth/application/get-session'
import { getClientProfile } from '@/src/modules/profile/application/get-client-profile'
import type {
  FiscalAddress,
  ProfileChangeFormState,
  ProfileFieldChange,
  ProfileFieldKey,
} from '@/src/modules/profile/domain/types'
import { sendProfileChangeRequest } from '@/src/modules/profile/infrastructure/profile-change-webhook-client'

const FIELD_LABELS: Record<ProfileFieldKey, string> = {
  name: profile.labels.name,
  email: profile.labels.email,
  phone: profile.labels.phone,
  address: profile.sections.address,
  taxId: profile.labels.taxId,
  iban: profile.labels.iban,
}

function parseAddress(formData: FormData): FiscalAddress {
  return {
    line1: String(formData.get('addressLine1') ?? '').trim(),
    line2: String(formData.get('addressLine2') ?? '').trim(),
    postalCode: String(formData.get('postalCode') ?? '').trim(),
    city: String(formData.get('city') ?? '').trim(),
    province: String(formData.get('province') ?? '').trim(),
    country: String(formData.get('country') ?? 'España').trim() || 'España',
  }
}

function getCurrentValue(
  key: ProfileFieldKey,
  currentProfile: ReturnType<typeof getClientProfile>
): string {
  switch (key) {
    case 'name':
      return currentProfile.name
    case 'email':
      return currentProfile.email
    case 'phone':
      return currentProfile.phone
    case 'address':
      return formatAddress(currentProfile.address)
    case 'taxId':
      return currentProfile.taxId
    case 'iban':
      return normalizeIban(currentProfile.iban)
  }
}

function getRequestedValue(
  key: ProfileFieldKey,
  input: ProfileChangeInput
): string {
  switch (key) {
    case 'name':
      return input.name.trim()
    case 'email':
      return input.email.trim()
    case 'phone':
      return input.phone.trim()
    case 'address':
      return formatAddress(input.address)
    case 'taxId':
      return input.taxId.trim().toUpperCase()
    case 'iban':
      return normalizeIban(input.iban)
  }
}

export async function submitProfileChangeRequestAction(
  _prev: ProfileChangeFormState | null,
  formData: FormData
): Promise<ProfileChangeFormState> {
  if (String(formData.get('website') ?? '').trim()) {
    return { ok: true }
  }

  const session = await getSession()
  if (!session) {
    return { ok: false, error: 'unauthorized' }
  }

  if (session.user.role !== 'client') {
    return { ok: false, error: 'forbidden' }
  }

  const currentProfile = getClientProfile(session.user)

  const rawInput = {
    name: String(formData.get('name') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    address: parseAddress(formData),
    taxId: String(formData.get('taxId') ?? '').trim(),
    iban: String(formData.get('iban') ?? '').trim(),
  }

  const selectedFields = detectChangedFields(currentProfile, rawInput)

  const input: ProfileChangeInput = {
    selectedFields,
    ...rawInput,
  }

  const fieldErrors = validateProfileChangeInput(input)
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: 'validation', fieldErrors }
  }

  const changes: ProfileFieldChange[] = []

  for (const field of selectedFields) {
    const currentValue = getCurrentValue(field, currentProfile)
    const requestedValue = getRequestedValue(field, input)

    if (currentValue === requestedValue) {
      continue
    }

    changes.push({
      field,
      label: FIELD_LABELS[field],
      currentValue,
      requestedValue,
    })
  }

  if (changes.length === 0) {
    return {
      ok: false,
      error: 'validation',
      fieldErrors: { _form: profile.errors.no_changes },
    }
  }

  const payload = {
    ticketTitle: `Cambios de datos de contacto en Syntia - ${currentProfile.name}`,
    clientId: currentProfile.id,
    clientName: currentProfile.name,
    clientEmail: currentProfile.email,
    changes,
    requestedAt: new Date().toISOString(),
  }

  try {
    await sendProfileChangeRequest(payload)
    return { ok: true }
  } catch {
    return { ok: false, error: 'unknown' }
  }
}
