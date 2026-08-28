import {
  ALTA_TRABAJADOR_STEP_IDS,
  type AltaTrabajadorStepId,
} from '@/src/modules/alta-trabajador/domain/alta-trabajador-steps'
import {
  EMPTY_ALTA_TRABAJADOR_FORM,
  type AltaTrabajadorFormValues,
} from '@/src/modules/alta-trabajador/domain/alta-trabajador-form-types'

export const ALTA_TRABAJADOR_DRAFT_STORAGE_KEY = 'syntia-alta-trabajador-draft'

export type AltaTrabajadorDraft = {
  values: AltaTrabajadorFormValues
  lastStepId: AltaTrabajadorStepId
}

function splitLegacyFullName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim()
  if (!trimmed) return { firstName: '', lastName: '' }
  const [firstName, ...rest] = trimmed.split(/\s+/)
  return { firstName: firstName ?? '', lastName: rest.join(' ') }
}

function parseLegacyValues(
  parsed: Partial<AltaTrabajadorFormValues> & { taxId?: string; fullName?: string }
): AltaTrabajadorFormValues {
  const { taxId: legacyTaxId, fullName: legacyFullName, ...rest } = parsed

  const needsNameMigration =
    (!rest.firstName?.trim() && !rest.lastName?.trim()) && legacyFullName?.trim()
  const migratedName = needsNameMigration
    ? splitLegacyFullName(legacyFullName as string)
    : null

  return {
    ...EMPTY_ALTA_TRABAJADOR_FORM,
    ...rest,
    dni: rest.dni ?? legacyTaxId ?? '',
    ...(migratedName
      ? { firstName: migratedName.firstName, lastName: migratedName.lastName }
      : {}),
  }
}

function normalizeLastStepId(value: unknown): AltaTrabajadorStepId {
  if (
    typeof value === 'string' &&
    (ALTA_TRABAJADOR_STEP_IDS as readonly string[]).includes(value)
  ) {
    return value as AltaTrabajadorStepId
  }
  return 'datos-personales'
}

export function hasAltaTrabajadorDraftContent(
  values: AltaTrabajadorFormValues
): boolean {
  return Object.values(values).some((value) => value.trim().length > 0)
}

export function readAltaTrabajadorDraft(): AltaTrabajadorDraft | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(ALTA_TRABAJADOR_DRAFT_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as
      | AltaTrabajadorDraft
      | Partial<AltaTrabajadorFormValues>

    if (parsed && typeof parsed === 'object' && 'values' in parsed) {
      const draft = parsed as AltaTrabajadorDraft
      const values = parseLegacyValues(draft.values ?? {})
      if (!hasAltaTrabajadorDraftContent(values)) return null
      return {
        values,
        lastStepId: normalizeLastStepId(draft.lastStepId),
      }
    }

    const values = parseLegacyValues(parsed as Partial<AltaTrabajadorFormValues>)
    if (!hasAltaTrabajadorDraftContent(values)) return null

    return {
      values,
      lastStepId: 'datos-personales',
    }
  } catch {
    return null
  }
}

export function writeAltaTrabajadorDraft(draft: AltaTrabajadorDraft) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(ALTA_TRABAJADOR_DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

export function clearAltaTrabajadorDraft() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(ALTA_TRABAJADOR_DRAFT_STORAGE_KEY)
}
