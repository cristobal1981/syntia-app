import { onboarding } from '@/content/onboarding'
import type { AltaAutonomoSubmission } from '@/lib/onboarding/validate-submission'
import { resolveOdooCountryId } from '@/src/modules/onboarding/resolve-odoo-country-id'
import { resolveOdooStateId } from '@/src/modules/onboarding/resolve-odoo-state-id'
import { odooCall, ODOO_ERROR } from '@/src/modules/portal/infrastructure/odoo-json-client'

const ODOO_MODEL = onboarding.altaAutonomo.odoo.model
const FIELD_MAP = onboarding.altaAutonomo.odoo.fields

type OdooFieldMeta = {
  type?: string
  selection?: Array<[string, string] | string[]>
}

type OdooFieldsGetResponse = Record<string, OdooFieldMeta>

let cachedFieldMeta: OdooFieldsGetResponse | null = null

const TRUTHY_SELECTION_KEYS = new Set(['si', 'sí', 'yes', 'true', '1'])
const FALSY_SELECTION_KEYS = new Set(['no', 'false', '0'])

function parseOdooCreatedId(result: number | number[] | undefined): number | null {
  if (typeof result === 'number' && result > 0) return result
  if (Array.isArray(result) && typeof result[0] === 'number' && result[0] > 0) {
    return result[0]
  }
  return null
}

async function loadOdooFieldMeta(): Promise<OdooFieldsGetResponse> {
  if (cachedFieldMeta) return cachedFieldMeta

  try {
    const fields = await odooCall<OdooFieldsGetResponse>(ODOO_MODEL, 'fields_get', {
      attributes: ['string', 'type', 'selection'],
    })
    cachedFieldMeta = fields ?? {}
    const available = Object.keys(cachedFieldMeta)
    console.info(
      `[onboarding] fields_get ${ODOO_MODEL}: ${available.slice(0, 80).join(', ')}`
    )
    return cachedFieldMeta
  } catch (error) {
    if (error instanceof Error && error.message === ODOO_ERROR.NOT_CONFIGURED) {
      console.warn('[onboarding] Odoo not configured, using fallback field map.')
      return {}
    }
    console.warn('[onboarding] fields_get failed, using fallback field map.', error)
    return {}
  }
}

function pickSelectionKey(
  fieldName: string,
  value: boolean,
  fieldMeta: OdooFieldsGetResponse
): string | boolean {
  const meta = fieldMeta[fieldName]
  if (!meta || meta.type === 'boolean') {
    return value
  }

  if (meta.type !== 'selection' || !Array.isArray(meta.selection)) {
    return value ? 'si' : 'no'
  }

  const options = meta.selection
    .map((entry) => (Array.isArray(entry) ? entry[0] : entry))
    .filter((entry): entry is string => typeof entry === 'string')

  const preferred = value ? TRUTHY_SELECTION_KEYS : FALSY_SELECTION_KEYS
  const match = options.find((option) => preferred.has(option.trim().toLowerCase()))
  if (match) return match

  if (options.length >= 2) {
    return value ? options[0] : options[1]
  }

  return value ? 'si' : 'no'
}

function buildOdooPayload(
  input: {
    recipientEmail: string | null
    submission: AltaAutonomoSubmission
    countryId: number
    provinceId: number
  },
  fieldMeta: OdooFieldsGetResponse
): Record<string, unknown> {
  const { submission } = input
  const payload: Record<string, unknown> = {
    [FIELD_MAP.recipientEmail]: input.recipientEmail ?? submission.email,
    [FIELD_MAP.fullName]: `${submission.firstName} ${submission.lastName}`.trim(),
    [FIELD_MAP.firstName]: submission.firstName,
    [FIELD_MAP.lastName]: submission.lastName,
    [FIELD_MAP.nifNie]: submission.nifNie,
    [FIELD_MAP.phone]: submission.phone,
    [FIELD_MAP.hasDigitalCertificate]: pickSelectionKey(
      FIELD_MAP.hasDigitalCertificate,
      submission.hasDigitalCertificate,
      fieldMeta
    ),
    [FIELD_MAP.isAlreadyAutonomo]: pickSelectionKey(
      FIELD_MAP.isAlreadyAutonomo,
      submission.isAlreadyAutonomo,
      fieldMeta
    ),
    [FIELD_MAP.wantsStartWithUsAt]: submission.wantsStartWithUsAt,
    [FIELD_MAP.activityAddress]: submission.activityAddress,
    [FIELD_MAP.city]: submission.city,
    [FIELD_MAP.province]: input.provinceId,
    [FIELD_MAP.postalCode]: submission.postalCode,
    [FIELD_MAP.country]: input.countryId,
    [FIELD_MAP.activityDescription]: submission.activityDescription,
    [FIELD_MAP.annualIncomeEstimateEur]: submission.annualIncomeEstimateEur,
    [FIELD_MAP.iban]: submission.iban,
    [FIELD_MAP.comments]: submission.comments ?? '',
  }

  if (submission.startedAutonomoAt) {
    payload[FIELD_MAP.startedAutonomoAt] = submission.startedAutonomoAt
  }
  if (submission.requestedAltaAt) {
    payload[FIELD_MAP.requestedAltaAt] = submission.requestedAltaAt
  }
  if (submission.wasAutonomoLast3Years !== undefined) {
    payload[FIELD_MAP.wasAutonomoLast3Years] = pickSelectionKey(
      FIELD_MAP.wasAutonomoLast3Years,
      submission.wasAutonomoLast3Years,
      fieldMeta
    )
  }
  if (submission.previousAutonomoEndDate) {
    payload[FIELD_MAP.previousAutonomoEndDate] = submission.previousAutonomoEndDate
  }

  return payload
}

export async function createAltaAutonomoInOdoo(input: {
  token: string
  recipientEmail: string | null
  submission: AltaAutonomoSubmission
}): Promise<number> {
  const fieldMeta = await loadOdooFieldMeta()
  const countryId = await resolveOdooCountryId(String(input.submission.countryId))
  const provinceId = await resolveOdooStateId(
    String(input.submission.provinceId),
    countryId
  )

  const created = await odooCall<number | number[]>(ODOO_MODEL, 'create', {
    vals_list: [
      buildOdooPayload(
        { ...input, countryId, provinceId },
        fieldMeta
      ),
    ],
  })

  const recordId = parseOdooCreatedId(created)
  if (!recordId) {
    throw new Error('ODOO_ALTA_AUTONOMO_CREATE_FAILED')
  }

  return recordId
}
