import { profile } from '@/content/profile'
import {
  detectChangedFields,
  formatAddress,
  normalizeIban,
  validateProfileChangeInput,
  type ProfileChangeInput,
} from '@/lib/profile/validate-profile-change'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getClientProfileForClient } from '@/src/modules/profile/application/get-client-profile-for-client'
import { buildProfileChangeLineItems } from '@/src/modules/profile/domain/build-profile-change-line-items'
import type {
  ClientProfile,
  ProfileChangeRequestBody,
  ProfileChangeResult,
  ProfileFieldChange,
  ProfileFieldKey,
} from '@/src/modules/profile/domain/types'
import { createProfileChangeTicketInOdoo } from '@/src/modules/profile/infrastructure/odoo-profile-change-repository'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

const FIELD_LABELS: Record<ProfileFieldKey, string> = {
  name: profile.labels.name,
  email: profile.labels.email,
  phone: profile.labels.phone,
  address: profile.sections.address,
  vat: profile.labels.vat,
  iban: profile.labels.iban,
}

function normalizeRequestBody(body: ProfileChangeRequestBody): Omit<ProfileChangeInput, 'selectedFields'> {
  return {
    name: body.name.trim(),
    email: body.email.trim(),
    phone: body.phone.trim(),
    address: {
      line1: body.address.line1.trim(),
      line2: body.address.line2.trim(),
      postalCode: body.address.postalCode.trim(),
      city: body.address.city.trim(),
      province: body.address.province.trim(),
      country: body.address.country.trim() || 'España',
    },
    vat: body.vat.trim(),
    iban: body.iban.trim(),
  }
}

function getCurrentValue(key: ProfileFieldKey, currentProfile: ClientProfile): string {
  switch (key) {
    case 'name':
      return currentProfile.name
    case 'email':
      return currentProfile.email
    case 'phone':
      return currentProfile.phone
    case 'address':
      return formatAddress(currentProfile.address)
    case 'vat':
      return currentProfile.vat
    case 'iban':
      return normalizeIban(currentProfile.iban)
  }
}

function getRequestedValue(key: ProfileFieldKey, input: ProfileChangeInput): string {
  switch (key) {
    case 'name':
      return input.name.trim()
    case 'email':
      return input.email.trim()
    case 'phone':
      return input.phone.trim()
    case 'address':
      return formatAddress(input.address)
    case 'vat':
      return input.vat.trim().toUpperCase()
    case 'iban':
      return normalizeIban(input.iban)
  }
}

export async function submitProfileChange(
  user: PortalUser,
  body: ProfileChangeRequestBody
): Promise<ProfileChangeResult> {
  if (body.website?.trim()) {
    return { ok: true }
  }

  if (user.role !== 'client') {
    return { ok: false, error: 'forbidden' }
  }

  const profileResult = await getClientProfileForClient(user)
  if (!profileResult.ok) {
    if (profileResult.error === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    if (profileResult.error === 'not_linked') {
      return { ok: false, error: 'not_linked' }
    }
    return { ok: false, error: 'odoo_unavailable' }
  }

  const currentProfile = profileResult.profile
  const rawInput = normalizeRequestBody(body)
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

  const partnerId = await resolveClientOdooPartnerId(user)
  if (!partnerId) {
    return { ok: false, error: 'not_linked' }
  }

  const ticketResult = await createProfileChangeTicketInOdoo({
    partnerId,
    subject: payload.ticketTitle,
    clientName: payload.clientName,
    clientEmail: payload.clientEmail,
    changes: payload.changes,
    lineItems: buildProfileChangeLineItems(currentProfile, rawInput),
    requestedAt: payload.requestedAt,
  })

  if (!ticketResult.ok) {
    return { ok: false, error: ticketResult.error }
  }

  return { ok: true, ticketId: ticketResult.ticketId }
}

export function parseProfileChangeRequestBody(
  value: unknown
): ProfileChangeRequestBody | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as Record<string, unknown>
  const addressValue = record.address

  if (!addressValue || typeof addressValue !== 'object') {
    return null
  }

  const address = addressValue as Record<string, unknown>

  return {
    website: typeof record.website === 'string' ? record.website : undefined,
    name: typeof record.name === 'string' ? record.name : '',
    email: typeof record.email === 'string' ? record.email : '',
    phone: typeof record.phone === 'string' ? record.phone : '',
    vat:
      typeof record.vat === 'string'
        ? record.vat
        : typeof record.taxId === 'string'
          ? record.taxId
          : '',
    iban: typeof record.iban === 'string' ? record.iban : '',
    address: {
      line1: typeof address.line1 === 'string' ? address.line1 : '',
      line2: typeof address.line2 === 'string' ? address.line2 : '',
      postalCode: typeof address.postalCode === 'string' ? address.postalCode : '',
      city: typeof address.city === 'string' ? address.city : '',
      province: typeof address.province === 'string' ? address.province : '',
      country: typeof address.country === 'string' ? address.country : 'España',
    },
  }
}
