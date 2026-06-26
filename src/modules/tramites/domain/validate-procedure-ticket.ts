import type { ProcedureTicketPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'

const FULL_NAME_MAX = 120
const OBSERVATIONS_MAX = 500

export type ProcedureFieldErrorKey =
  | 'fullNameRequired'
  | 'fullNameTooLong'
  | 'taxIdRequired'
  | 'taxIdInvalid'
  | 'dateRequired'
  | 'dateInvalid'
  | 'dateInPast'
  | 'periodEndBeforeStart'
  | 'selectRequired'
  | 'positionRequired'
  | 'grossSalaryRequired'
  | 'grossSalaryInvalid'
  | 'daysRequired'
  | 'daysInvalid'
  | 'vacationYearRequired'
  | 'vacationYearInvalid'
  | 'observationsTooLong'

function trim(value: string): string {
  return value.trim()
}

export function normalizeTaxId(value: string): string {
  return trim(value).toUpperCase().replace(/\s/g, '')
}

export function isValidTaxId(value: string): boolean {
  const normalized = normalizeTaxId(value)
  return (
    /^[0-9]{8}[A-Z]$/.test(normalized) ||
    /^[XYZ][0-9]{7}[A-Z]$/.test(normalized)
  )
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime())
}

/** Fecha local YYYY-MM-DD (para inputs type="date" y validación). */
export function todayIsoDateLocal(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isDateBeforeToday(value: string): boolean {
  if (!isValidIsoDate(value)) return false
  return value < todayIsoDateLocal()
}

function validateCommonWorkerFields(
  fullName: string,
  taxId: string,
  observations: string,
  fieldErrors: Record<string, ProcedureFieldErrorKey>
) {
  const name = trim(fullName)
  if (!name) {
    fieldErrors.fullName = 'fullNameRequired'
  } else if (name.length > FULL_NAME_MAX) {
    fieldErrors.fullName = 'fullNameTooLong'
  }

  const id = trim(taxId)
  if (!id) {
    fieldErrors.taxId = 'taxIdRequired'
  } else if (!isValidTaxId(id)) {
    fieldErrors.taxId = 'taxIdInvalid'
  }

  if (trim(observations).length > OBSERVATIONS_MAX) {
    fieldErrors.observations = 'observationsTooLong'
  }
}

function validateRequiredDate(
  value: string,
  field: string,
  fieldErrors: Record<string, ProcedureFieldErrorKey>
) {
  const date = trim(value)
  if (!date) {
    fieldErrors[field] = 'dateRequired'
    return
  }
  if (!isValidIsoDate(date)) {
    fieldErrors[field] = 'dateInvalid'
  }
}

function validateRequiredSelect(
  value: string,
  field: string,
  fieldErrors: Record<string, ProcedureFieldErrorKey>
) {
  if (!trim(value)) {
    fieldErrors[field] = 'selectRequired'
  }
}

export function validateProcedureTicketPayload(
  payload: ProcedureTicketPayload
): Record<string, ProcedureFieldErrorKey> {
  const fieldErrors: Record<string, ProcedureFieldErrorKey> = {}

  validateCommonWorkerFields(
    payload.fullName,
    payload.taxId,
    payload.observations,
    fieldErrors
  )

  if (payload.type === 'alta-trabajador') {
    validateRequiredDate(payload.startDate, 'startDate', fieldErrors)
    if (
      !fieldErrors.startDate &&
      isValidIsoDate(payload.startDate) &&
      isDateBeforeToday(payload.startDate)
    ) {
      fieldErrors.startDate = 'dateInPast'
    }
    validateRequiredSelect(payload.contractType, 'contractType', fieldErrors)
    validateRequiredSelect(payload.workSchedule, 'workSchedule', fieldErrors)

    if (!trim(payload.position)) {
      fieldErrors.position = 'positionRequired'
    }

    const salary = trim(payload.grossSalary).replace(/\./g, '').replace(',', '.')
    if (!salary) {
      fieldErrors.grossSalary = 'grossSalaryRequired'
    } else if (!/^\d+(\.\d{1,2})?$/.test(salary)) {
      fieldErrors.grossSalary = 'grossSalaryInvalid'
    }
  }

  if (payload.type === 'baja-trabajador') {
    validateRequiredDate(payload.endDate, 'endDate', fieldErrors)
    validateRequiredSelect(payload.reason, 'reason', fieldErrors)
  }

  if (payload.type === 'carta-vacaciones') {
    validateRequiredDate(payload.periodStart, 'periodStart', fieldErrors)
    validateRequiredDate(payload.periodEnd, 'periodEnd', fieldErrors)

    if (
      isValidIsoDate(payload.periodStart) &&
      isValidIsoDate(payload.periodEnd) &&
      payload.periodEnd < payload.periodStart
    ) {
      fieldErrors.periodEnd = 'periodEndBeforeStart'
    }

    const days = trim(payload.days)
    if (!days) {
      fieldErrors.days = 'daysRequired'
    } else if (!/^\d{1,3}$/.test(days) || Number(days) < 1) {
      fieldErrors.days = 'daysInvalid'
    }

    const year = trim(payload.vacationYear)
    if (!year) {
      fieldErrors.vacationYear = 'vacationYearRequired'
    } else if (!/^\d{4}$/.test(year)) {
      fieldErrors.vacationYear = 'vacationYearInvalid'
    }
  }

  return fieldErrors
}

export function normalizeProcedureTicketPayload(
  payload: ProcedureTicketPayload
): ProcedureTicketPayload {
  const base = {
    fullName: trim(payload.fullName),
    taxId: normalizeTaxId(payload.taxId),
    observations: trim(payload.observations),
  }

  if (payload.type === 'alta-trabajador') {
    return {
      type: 'alta-trabajador',
      ...base,
      startDate: trim(payload.startDate),
      contractType: trim(payload.contractType),
      workSchedule: trim(payload.workSchedule),
      position: trim(payload.position),
      grossSalary: trim(payload.grossSalary),
    }
  }

  if (payload.type === 'baja-trabajador') {
    return {
      type: 'baja-trabajador',
      ...base,
      endDate: trim(payload.endDate),
      reason: trim(payload.reason),
    }
  }

  return {
    type: 'carta-vacaciones',
    ...base,
    periodStart: trim(payload.periodStart),
    periodEnd: trim(payload.periodEnd),
    days: trim(payload.days),
    vacationYear: trim(payload.vacationYear),
  }
}
