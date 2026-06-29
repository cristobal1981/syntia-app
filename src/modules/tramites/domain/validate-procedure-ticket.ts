import type { ProcedureTicketPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'
import {
  applyFieldRule,
  isIsoDateBeforeToday,
  isValidDni,
  isValidFourDigitYear,
  isValidIsoDate,
  isValidPositiveDecimal,
  isValidPositiveInteger,
  normalizeDni,
  requireIsoDate,
  requireMaxLength,
  requireSelected,
  requireTrimmed,
  trim,
} from '@/lib/validation'

const FULL_NAME_MAX = 120
const OBSERVATIONS_MAX = 500

export type ProcedureFieldErrorKey =
  | 'fullNameRequired'
  | 'fullNameTooLong'
  | 'dniRequired'
  | 'dniInvalid'
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

export { normalizeDni, todayIsoDateLocal } from '@/lib/validation'

function validateCommonWorkerFields(
  fullName: string,
  dni: string,
  observations: string,
  fieldErrors: Record<string, ProcedureFieldErrorKey>
) {
  applyFieldRule(
    fieldErrors,
    'fullName',
    requireTrimmed(fullName, 'fullNameRequired')
  )
  applyFieldRule(
    fieldErrors,
    'fullName',
    requireMaxLength(fullName, FULL_NAME_MAX, 'fullNameTooLong')
  )

  const id = trim(dni)
  if (!id) {
    fieldErrors.dni = 'dniRequired'
  } else if (!isValidDni(id)) {
    fieldErrors.dni = 'dniInvalid'
  }

  applyFieldRule(
    fieldErrors,
    'observations',
    requireMaxLength(observations, OBSERVATIONS_MAX, 'observationsTooLong')
  )
}

function validateRequiredDateField(
  value: string,
  field: string,
  fieldErrors: Record<string, ProcedureFieldErrorKey>
) {
  applyFieldRule(
    fieldErrors,
    field,
    requireIsoDate(value, 'dateRequired', 'dateInvalid')
  )
}

function validateRequiredSelectField(
  value: string,
  field: string,
  fieldErrors: Record<string, ProcedureFieldErrorKey>
) {
  applyFieldRule(fieldErrors, field, requireSelected(value, 'selectRequired'))
}

export function validateProcedureTicketPayload(
  payload: ProcedureTicketPayload
): Record<string, ProcedureFieldErrorKey> {
  const fieldErrors: Record<string, ProcedureFieldErrorKey> = {}

  validateCommonWorkerFields(
    payload.fullName,
    payload.dni,
    payload.observations,
    fieldErrors
  )

  if (payload.type === 'alta-trabajador') {
    validateRequiredDateField(payload.startDate, 'startDate', fieldErrors)
    if (
      !fieldErrors.startDate &&
      isValidIsoDate(payload.startDate) &&
      isIsoDateBeforeToday(payload.startDate)
    ) {
      fieldErrors.startDate = 'dateInPast'
    }
    validateRequiredSelectField(payload.contractType, 'contractType', fieldErrors)
    validateRequiredSelectField(payload.workSchedule, 'workSchedule', fieldErrors)

    applyFieldRule(
      fieldErrors,
      'position',
      requireTrimmed(payload.position, 'positionRequired')
    )

    const salary = trim(payload.grossSalary)
    if (!trim(salary)) {
      fieldErrors.grossSalary = 'grossSalaryRequired'
    } else if (!isValidPositiveDecimal(salary)) {
      fieldErrors.grossSalary = 'grossSalaryInvalid'
    }
  }

  if (payload.type === 'baja-trabajador') {
    validateRequiredDateField(payload.endDate, 'endDate', fieldErrors)
    validateRequiredSelectField(payload.reason, 'reason', fieldErrors)
  }

  if (payload.type === 'carta-vacaciones') {
    validateRequiredDateField(payload.periodStart, 'periodStart', fieldErrors)
    validateRequiredDateField(payload.periodEnd, 'periodEnd', fieldErrors)

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
    } else if (!isValidPositiveInteger(days, { maxDigits: 3 })) {
      fieldErrors.days = 'daysInvalid'
    }

    const year = trim(payload.vacationYear)
    if (!year) {
      fieldErrors.vacationYear = 'vacationYearRequired'
    } else if (!isValidFourDigitYear(year)) {
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
    dni: normalizeDni(payload.dni),
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
      ...(payload.partialWeeklyHours?.trim()
        ? { partialWeeklyHours: trim(payload.partialWeeklyHours) }
        : {}),
      ...(payload.contractEndDate?.trim()
        ? { contractEndDate: trim(payload.contractEndDate) }
        : {}),
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
