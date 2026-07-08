export type AdvisorVisibility = 'none' | 'all' | 'selected'

export type AutomationRunStatus = 'sent' | 'failed'

export type AutomationInputOption = {
  value: string
  label: string
}

export type AutomationInputFieldType = 'select' | 'text'

/** Campo de entrada que se pide al lanzar y viaja al webhook con su clave. */
export type AutomationInputField = {
  key: string
  label: string
  type: AutomationInputFieldType
  required: boolean
  defaultValue: string | null
  /** Solo para type === 'select'. */
  options: AutomationInputOption[]
}

export const AUTOMATION_INPUT_KEY_PATTERN = /^[a-z][a-z0-9_]{0,39}$/
export const MAX_AUTOMATION_INPUT_FIELDS = 6
export const MAX_AUTOMATION_INPUT_OPTIONS = 24
export const MAX_AUTOMATION_INPUT_TEXT_LENGTH = 500

export type PortalAutomation = {
  id: string
  slug: string
  title: string
  description: string | null
  webhookPath: string
  icon: string
  sortOrder: number
  isActive: boolean
  visibility: AdvisorVisibility
  grantedAdvisorIds: string[]
  inputFields: AutomationInputField[]
}

export type PortalAutomationRun = {
  id: string
  automationId: string
  automationSlug: string
  automationTitle: string
  triggeredBy: string
  triggeredByName: string | null
  status: AutomationRunStatus
  httpStatus: number | null
  errorMessage: string | null
  createdAt: string
}

export type PortalAutomationListItem = PortalAutomation & {
  lastRun: Pick<
    PortalAutomationRun,
    'status' | 'createdAt' | 'httpStatus'
  > | null
}

type AutomationVisibilityInput = Pick<
  PortalAutomation,
  'isActive' | 'visibility' | 'grantedAdvisorIds'
>

export function advisorCanSeeAutomation(
  automation: AutomationVisibilityInput,
  advisorId: string
): boolean {
  if (!automation.isActive) {
    return false
  }
  if (automation.visibility === 'all') {
    return true
  }
  if (automation.visibility === 'selected') {
    return automation.grantedAdvisorIds.includes(advisorId)
  }
  return false
}

export function adminCanSeeAutomation(
  automation: Pick<PortalAutomation, 'isActive'>
): boolean {
  return automation.isActive
}

function parseInputOption(raw: unknown): AutomationInputOption | null {
  if (typeof raw !== 'object' || raw === null) return null
  const value = (raw as { value?: unknown }).value
  const label = (raw as { label?: unknown }).label
  if (typeof value !== 'string' || !value.trim()) return null
  const trimmedValue = value.trim()
  const trimmedLabel =
    typeof label === 'string' && label.trim() ? label.trim() : trimmedValue
  return { value: trimmedValue, label: trimmedLabel }
}

/** Sanea el jsonb crudo de BD: descarta entradas malformadas sin lanzar. */
export function parseAutomationInputFields(raw: unknown): AutomationInputField[] {
  if (!Array.isArray(raw)) return []

  const fields: AutomationInputField[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) continue
    const key = (entry as { key?: unknown }).key
    const label = (entry as { label?: unknown }).label
    const required = (entry as { required?: unknown }).required
    const defaultValue = (entry as { defaultValue?: unknown }).defaultValue
    const options = (entry as { options?: unknown }).options
    const typeRaw = (entry as { type?: unknown }).type
    const type: AutomationInputFieldType =
      typeRaw === 'text' ? 'text' : 'select'

    if (typeof key !== 'string' || !AUTOMATION_INPUT_KEY_PATTERN.test(key)) continue

    if (type === 'text') {
      const parsedDefault =
        typeof defaultValue === 'string' ? defaultValue.trim() || null : null
      fields.push({
        key,
        label: typeof label === 'string' && label.trim() ? label.trim() : key,
        type: 'text',
        required: required !== false,
        defaultValue: parsedDefault,
        options: [],
      })
      if (fields.length >= MAX_AUTOMATION_INPUT_FIELDS) break
      continue
    }

    if (!Array.isArray(options)) continue

    const parsedOptions = options
      .map(parseInputOption)
      .filter((option): option is AutomationInputOption => option !== null)
    if (!parsedOptions.length) continue

    const optionValues = new Set(parsedOptions.map((option) => option.value))
    const parsedDefault =
      typeof defaultValue === 'string' && optionValues.has(defaultValue)
        ? defaultValue
        : null

    fields.push({
      key,
      label: typeof label === 'string' && label.trim() ? label.trim() : key,
      type: 'select',
      required: required !== false,
      defaultValue: parsedDefault,
      options: parsedOptions,
    })

    if (fields.length >= MAX_AUTOMATION_INPUT_FIELDS) break
  }

  return fields
}

export type AutomationInputFieldsValidation =
  | { ok: true; fields: AutomationInputField[] }
  | { ok: false; message: string }

/** Valida y normaliza la definición completa de campos (creación). */
export function validateAutomationInputFieldsDefinition(
  fields: AutomationInputField[]
): AutomationInputFieldsValidation {
  if (fields.length > MAX_AUTOMATION_INPUT_FIELDS) {
    return {
      ok: false,
      message: `Máximo ${MAX_AUTOMATION_INPUT_FIELDS} parámetros por automatización.`,
    }
  }

  const normalized: AutomationInputField[] = []
  const seenKeys = new Set<string>()

  for (const field of fields) {
    const key = field.key.trim().toLowerCase()
    if (!AUTOMATION_INPUT_KEY_PATTERN.test(key)) {
      return {
        ok: false,
        message: `Clave de parámetro no válida: «${field.key}». Usa minúsculas, números y _ empezando por letra.`,
      }
    }
    if (seenKeys.has(key)) {
      return { ok: false, message: `Clave de parámetro repetida: «${key}».` }
    }
    seenKeys.add(key)

    const label = field.label.trim()
    if (!label) {
      return { ok: false, message: `El parámetro «${key}» necesita etiqueta.` }
    }

    const type = field.type === 'text' ? 'text' : 'select'

    if (type === 'text') {
      const defaultValue = field.defaultValue?.trim() || null
      if (defaultValue && defaultValue.length > MAX_AUTOMATION_INPUT_TEXT_LENGTH) {
        return {
          ok: false,
          message: `El valor por defecto de «${key}» es demasiado largo.`,
        }
      }
      normalized.push({
        key,
        label,
        type: 'text',
        required: field.required,
        defaultValue,
        options: [],
      })
      continue
    }

    if (!field.options.length) {
      return { ok: false, message: `El parámetro «${key}» necesita al menos una opción.` }
    }
    if (field.options.length > MAX_AUTOMATION_INPUT_OPTIONS) {
      return {
        ok: false,
        message: `El parámetro «${key}» supera las ${MAX_AUTOMATION_INPUT_OPTIONS} opciones.`,
      }
    }

    const options: AutomationInputOption[] = []
    const seenValues = new Set<string>()
    for (const option of field.options) {
      const value = option.value.trim()
      if (!value) {
        return { ok: false, message: `El parámetro «${key}» tiene una opción sin valor.` }
      }
      if (seenValues.has(value)) {
        return {
          ok: false,
          message: `El parámetro «${key}» repite el valor de opción «${value}».`,
        }
      }
      seenValues.add(value)
      options.push({ value, label: option.label.trim() || value })
    }

    const defaultValue = field.defaultValue?.trim() || null
    if (defaultValue && !seenValues.has(defaultValue)) {
      return {
        ok: false,
        message: `La opción por defecto de «${key}» no está entre sus opciones.`,
      }
    }

    normalized.push({
      key,
      label,
      type: 'select',
      required: field.required,
      defaultValue,
      options,
    })
  }

  return { ok: true, fields: normalized }
}

export type AutomationInputValuesValidation =
  | { ok: true; inputs: Record<string, string> }
  | { ok: false; message: string }

/** Valida los valores recibidos al lanzar: requerido presente (o default), valor ∈ opciones. */
export function validateAutomationInputValues(
  fields: AutomationInputField[],
  values: Record<string, string>
): AutomationInputValuesValidation {
  const inputs: Record<string, string> = {}

  for (const field of fields) {
    const raw = values[field.key]
    const value = typeof raw === 'string' ? raw.trim() : ''
    const resolved = value || field.defaultValue || ''

    if (!resolved) {
      if (field.required) {
        return { ok: false, message: `Falta el parámetro «${field.label}».` }
      }
      continue
    }

    if (field.type === 'text') {
      if (resolved.length > MAX_AUTOMATION_INPUT_TEXT_LENGTH) {
        return {
          ok: false,
          message: `El parámetro «${field.label}» es demasiado largo.`,
        }
      }
      inputs[field.key] = resolved
      continue
    }

    if (!field.options.some((option) => option.value === resolved)) {
      return {
        ok: false,
        message: `Valor no permitido para «${field.label}».`,
      }
    }

    inputs[field.key] = resolved
  }

  return { ok: true, inputs }
}
