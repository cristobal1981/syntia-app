import type {
  ProcedureTicketPayload,
  TrabajadorAltaPayload,
} from '@/src/modules/tramites/domain/procedure-ticket-types'
import {
  applyFieldRule,
  isIsoDateBeforeToday,
  isValidDni,
  isValidEmail,
  isValidFourDigitYear,
  isValidIsoDate,
  isValidPhone,
  isValidPositiveDecimal,
  isValidPositiveInteger,
  isValidSpanishIban,
  isValidSpanishPostalCode,
  normalizeDni,
  normalizeIban,
  requireIsoDate,
  requireMaxLength,
  requireSelected,
  requireTrimmed,
  trim,
} from '@/lib/validation'
import { weekdaysOverlap } from '@/lib/weekdays'

const FULL_NAME_MAX = 120
const OBSERVATIONS_MAX = 500

export type ProcedureFieldErrorKey =
  | 'fullNameRequired'
  | 'fullNameTooLong'
  | 'firstNameRequired'
  | 'firstNameTooLong'
  | 'lastNameRequired'
  | 'lastNameTooLong'
  | 'dniRequired'
  | 'dniInvalid'
  | 'dateRequired'
  | 'dateInvalid'
  | 'dateInPast'
  | 'periodEndBeforeStart'
  | 'selectRequired'
  | 'requiredField'
  | 'positionRequired'
  | 'grossSalaryRequired'
  | 'grossSalaryInvalid'
  | 'amountInvalid'
  | 'daysRequired'
  | 'daysInvalid'
  | 'vacationYearRequired'
  | 'vacationYearInvalid'
  | 'observationsTooLong'
  | 'emailInvalid'
  | 'phoneInvalid'
  | 'ibanInvalid'
  | 'postalCodeInvalid'
  | 'attachmentRequired'
  | 'daysOverlap'

export { normalizeDni, todayIsoDateLocal } from '@/lib/validation'

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

function validateRequiredTextField(
  value: string | undefined,
  field: string,
  fieldErrors: Record<string, ProcedureFieldErrorKey>
) {
  applyFieldRule(fieldErrors, field, requireTrimmed(value ?? '', 'requiredField'))
}

function validateRequiredAddress<P extends 'address' | 'teleworkAddress'>(
  prefix: P,
  payload: {
    [K in
      | `${P}Street`
      | `${P}Number`
      | `${P}City`
      | `${P}Province`
      | `${P}PostalCode`]?: string
  },
  fieldErrors: Record<string, ProcedureFieldErrorKey>
) {
  validateRequiredTextField(payload[`${prefix}Street`], `${prefix}Street`, fieldErrors)
  validateRequiredTextField(payload[`${prefix}Number`], `${prefix}Number`, fieldErrors)
  validateRequiredTextField(payload[`${prefix}City`], `${prefix}City`, fieldErrors)
  validateRequiredTextField(payload[`${prefix}Province`], `${prefix}Province`, fieldErrors)

  const postalCode = trim(payload[`${prefix}PostalCode`] ?? '')
  if (!postalCode) {
    fieldErrors[`${prefix}PostalCode`] = 'requiredField'
  } else if (!isValidSpanishPostalCode(postalCode)) {
    fieldErrors[`${prefix}PostalCode`] = 'postalCodeInvalid'
  }
}

function showsContractEndDate(payload: TrabajadorAltaPayload): boolean {
  if (payload.contractType === 'formacion' || payload.contractType === 'otros') return true
  if (payload.contractType === 'temporal') {
    return (
      payload.temporaryReason === 'incremento_tareas' ||
      payload.temporaryReason === 'otras_causas'
    )
  }
  return false
}

function validateAltaTrabajadorPayload(
  payload: TrabajadorAltaPayload,
  fieldErrors: Record<string, ProcedureFieldErrorKey>
) {
  applyFieldRule(fieldErrors, 'firstName', requireTrimmed(payload.firstName, 'firstNameRequired'))
  applyFieldRule(
    fieldErrors,
    'firstName',
    requireMaxLength(payload.firstName, FULL_NAME_MAX, 'firstNameTooLong')
  )
  applyFieldRule(fieldErrors, 'lastName', requireTrimmed(payload.lastName, 'lastNameRequired'))
  applyFieldRule(
    fieldErrors,
    'lastName',
    requireMaxLength(payload.lastName, FULL_NAME_MAX, 'lastNameTooLong')
  )

  const email = trim(payload.email)
  if (email && !isValidEmail(email)) {
    fieldErrors.email = 'emailInvalid'
  }
  if (!isValidPhone(payload.phone)) {
    fieldErrors.phone = 'phoneInvalid'
  }
  const iban = trim(payload.iban)
  if (iban && !isValidSpanishIban(normalizeIban(iban))) {
    fieldErrors.iban = 'ibanInvalid'
  }

  validateRequiredDateField(payload.birthDate, 'birthDate', fieldErrors)
  validateRequiredAddress('address', payload, fieldErrors)

  validateRequiredDateField(payload.startDate, 'startDate', fieldErrors)
  if (
    !fieldErrors.startDate &&
    isValidIsoDate(payload.startDate) &&
    isIsoDateBeforeToday(payload.startDate)
  ) {
    fieldErrors.startDate = 'dateInPast'
  }
  validateRequiredTextField(payload.workCenter, 'workCenter', fieldErrors)
  applyFieldRule(
    fieldErrors,
    'position',
    requireTrimmed(payload.position, 'positionRequired')
  )
  validateRequiredTextField(payload.jobDuties, 'jobDuties', fieldErrors)
  validateRequiredSelectField(payload.sepeOccupationCode, 'sepeOccupationCode', fieldErrors)
  validateRequiredSelectField(payload.studiesLevel, 'studiesLevel', fieldErrors)

  validateRequiredSelectField(payload.contractType, 'contractType', fieldErrors)

  if (payload.contractType === 'temporal') {
    validateRequiredSelectField(payload.temporaryReason ?? '', 'temporaryReason', fieldErrors)

    if (payload.temporaryReason === 'incremento_tareas') {
      validateRequiredTextField(
        payload.temporaryIncreaseCauses,
        'temporaryIncreaseCauses',
        fieldErrors
      )
      validateRequiredTextField(
        payload.temporaryDurationReason,
        'temporaryDurationReason',
        fieldErrors
      )
    }
    if (payload.temporaryReason === 'sustitucion_vacaciones') {
      validateRequiredTextField(
        payload.vacationSubstitutionDetails,
        'vacationSubstitutionDetails',
        fieldErrors
      )
    }
    if (
      payload.temporaryReason === 'sustitucion_it' ||
      payload.temporaryReason === 'sustitucion_paternidad_maternidad'
    ) {
      validateRequiredTextField(
        payload.employeeToSubstitute,
        'employeeToSubstitute',
        fieldErrors
      )
    }
    if (payload.temporaryReason === 'otras_causas') {
      validateRequiredTextField(
        payload.otherTemporaryReasonDetail,
        'otherTemporaryReasonDetail',
        fieldErrors
      )
    }
  }

  if (payload.contractType === 'formacion') {
    validateRequiredSelectField(payload.trainingType ?? '', 'trainingType', fieldErrors)
    validateRequiredSelectField(
      payload.trainingHasScholarship ?? '',
      'trainingHasScholarship',
      fieldErrors
    )
    if (payload.trainingHasScholarship === 'si') {
      const amount = trim(payload.trainingScholarshipAmount ?? '')
      if (!amount) {
        fieldErrors.trainingScholarshipAmount = 'requiredField'
      } else if (!isValidPositiveDecimal(amount)) {
        fieldErrors.trainingScholarshipAmount = 'amountInvalid'
      }
      validateRequiredTextField(
        payload.trainingScholarshipPayer,
        'trainingScholarshipPayer',
        fieldErrors
      )
    }
  }

  if (payload.contractType === 'otros') {
    validateRequiredTextField(payload.otherContractReason, 'otherContractReason', fieldErrors)
  }

  if (showsContractEndDate(payload)) {
    validateRequiredDateField(payload.contractEndDate ?? '', 'contractEndDate', fieldErrors)
  }

  validateRequiredSelectField(payload.isTelework, 'isTelework', fieldErrors)
  if (payload.isTelework === 'si') {
    validateRequiredAddress('teleworkAddress', payload, fieldErrors)
    validateRequiredTextField(payload.teleworkEquipment, 'teleworkEquipment', fieldErrors)
    validateRequiredTextField(payload.teleworkAmountAgreed, 'teleworkAmountAgreed', fieldErrors)
    validateRequiredSelectField(
      payload.teleworkFullTime ?? '',
      'teleworkFullTime',
      fieldErrors
    )
    if (payload.teleworkFullTime === 'no') {
      validateRequiredTextField(payload.teleworkDaysRemote, 'teleworkDaysRemote', fieldErrors)
      validateRequiredTextField(payload.teleworkDaysOnsite, 'teleworkDaysOnsite', fieldErrors)
      if (
        !fieldErrors.teleworkDaysRemote &&
        !fieldErrors.teleworkDaysOnsite &&
        weekdaysOverlap(payload.teleworkDaysRemote ?? '', payload.teleworkDaysOnsite ?? '')
      ) {
        fieldErrors.teleworkDaysOnsite = 'daysOverlap'
      }
    }
  }

  validateRequiredSelectField(payload.salaryType, 'salaryType', fieldErrors)
  if (payload.salaryType === 'pactado') {
    const salary = trim(payload.grossSalary ?? '')
    if (!salary) {
      fieldErrors.grossSalary = 'grossSalaryRequired'
    } else if (!isValidPositiveDecimal(salary)) {
      fieldErrors.grossSalary = 'grossSalaryInvalid'
    }
  }

  validateRequiredSelectField(payload.workSchedule, 'workSchedule', fieldErrors)
  if (payload.workSchedule === 'parcial') {
    const hours = trim(payload.partialWeeklyHours ?? '')
    if (!hours) {
      fieldErrors.partialWeeklyHours = 'daysRequired'
    } else if (!isValidPositiveInteger(hours, { maxDigits: 2 })) {
      fieldErrors.partialWeeklyHours = 'daysInvalid'
    }
  }

  validateRequiredSelectField(payload.workDays, 'workDays', fieldErrors)
  validateRequiredTextField(payload.workHoursDescription, 'workHoursDescription', fieldErrors)

  validateRequiredSelectField(
    payload.requiresWorkAuthorization,
    'requiresWorkAuthorization',
    fieldErrors
  )
  if (payload.requiresWorkAuthorization === 'si' && !payload.identityDocument) {
    fieldErrors.identityDocument = 'attachmentRequired'
  }

  applyFieldRule(
    fieldErrors,
    'observations',
    requireMaxLength(payload.observations, OBSERVATIONS_MAX, 'observationsTooLong')
  )
}

function validateCombinedFullName(
  fullName: string,
  fieldErrors: Record<string, ProcedureFieldErrorKey>
) {
  applyFieldRule(fieldErrors, 'fullName', requireTrimmed(fullName, 'fullNameRequired'))
  applyFieldRule(
    fieldErrors,
    'fullName',
    requireMaxLength(fullName, FULL_NAME_MAX, 'fullNameTooLong')
  )
}

export function validateProcedureTicketPayload(
  payload: ProcedureTicketPayload
): Record<string, ProcedureFieldErrorKey> {
  const fieldErrors: Record<string, ProcedureFieldErrorKey> = {}

  if (payload.type !== 'alta-trabajador') {
    validateCombinedFullName(payload.fullName, fieldErrors)
  }

  const dni = trim(payload.dni)
  if (!dni) {
    fieldErrors.dni = 'dniRequired'
  } else if (!isValidDni(dni)) {
    fieldErrors.dni = 'dniInvalid'
  }

  if (payload.type === 'alta-trabajador') {
    validateAltaTrabajadorPayload(payload, fieldErrors)
  } else {
    applyFieldRule(
      fieldErrors,
      'observations',
      requireMaxLength(payload.observations, OBSERVATIONS_MAX, 'observationsTooLong')
    )
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

function trimOptional(value: string | undefined): string | undefined {
  if (value === undefined) return undefined
  const trimmed = trim(value)
  return trimmed ? trimmed : undefined
}

function normalizeAltaTrabajadorPayload(payload: TrabajadorAltaPayload): TrabajadorAltaPayload {
  const firstName = trim(payload.firstName)
  const lastName = trim(payload.lastName)

  return {
    ...payload,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    dni: normalizeDni(payload.dni),
    naf: trim(payload.naf),
    email: trim(payload.email),
    phone: trim(payload.phone),
    iban: payload.iban.trim() ? normalizeIban(payload.iban) : '',

    birthDate: trim(payload.birthDate),
    addressStreet: trim(payload.addressStreet),
    addressNumber: trim(payload.addressNumber),
    addressCity: trim(payload.addressCity),
    addressProvince: trim(payload.addressProvince),
    addressPostalCode: trim(payload.addressPostalCode),

    startDate: trim(payload.startDate),
    workCenter: trim(payload.workCenter),
    position: trim(payload.position),
    jobDuties: trim(payload.jobDuties),
    sepeOccupationCode: trim(payload.sepeOccupationCode),
    studiesLevel: trim(payload.studiesLevel),

    contractType: trim(payload.contractType),
    temporaryReason: trimOptional(payload.temporaryReason),
    temporaryIncreaseCauses: trimOptional(payload.temporaryIncreaseCauses),
    temporaryDurationReason: trimOptional(payload.temporaryDurationReason),
    vacationSubstitutionDetails: trimOptional(payload.vacationSubstitutionDetails),
    employeeToSubstitute: trimOptional(payload.employeeToSubstitute),
    otherTemporaryReasonDetail: trimOptional(payload.otherTemporaryReasonDetail),
    trainingType: trimOptional(payload.trainingType),
    trainingHasScholarship: trimOptional(payload.trainingHasScholarship),
    trainingScholarshipAmount: trimOptional(payload.trainingScholarshipAmount),
    trainingScholarshipPayer: trimOptional(payload.trainingScholarshipPayer),
    otherContractReason: trimOptional(payload.otherContractReason),
    contractEndDate: trimOptional(payload.contractEndDate),

    isTelework: trim(payload.isTelework),
    teleworkAddressStreet: trimOptional(payload.teleworkAddressStreet),
    teleworkAddressNumber: trimOptional(payload.teleworkAddressNumber),
    teleworkAddressCity: trimOptional(payload.teleworkAddressCity),
    teleworkAddressProvince: trimOptional(payload.teleworkAddressProvince),
    teleworkAddressPostalCode: trimOptional(payload.teleworkAddressPostalCode),
    teleworkEquipment: trimOptional(payload.teleworkEquipment),
    teleworkAmountAgreed: trimOptional(payload.teleworkAmountAgreed),
    teleworkFullTime: trimOptional(payload.teleworkFullTime),
    teleworkDaysRemote: trimOptional(payload.teleworkDaysRemote),
    teleworkDaysOnsite: trimOptional(payload.teleworkDaysOnsite),

    salaryType: trim(payload.salaryType),
    grossSalary: trimOptional(payload.grossSalary),
    workSchedule: trim(payload.workSchedule),
    partialWeeklyHours: trimOptional(payload.partialWeeklyHours),
    workDays: trim(payload.workDays),
    workHoursDescription: trim(payload.workHoursDescription),
    workScheduleNotes: trim(payload.workScheduleNotes),

    observations: trim(payload.observations),
    requiresWorkAuthorization: trim(payload.requiresWorkAuthorization),
    identityDocument: payload.identityDocument,
  }
}

export function normalizeProcedureTicketPayload<T extends ProcedureTicketPayload>(
  payload: T
): T {
  if (payload.type === 'alta-trabajador') {
    return normalizeAltaTrabajadorPayload(payload) as T
  }

  const base = {
    fullName: trim(payload.fullName),
    dni: normalizeDni(payload.dni),
    observations: trim(payload.observations),
  }

  if (payload.type === 'baja-trabajador') {
    return {
      type: 'baja-trabajador',
      ...base,
      endDate: trim(payload.endDate),
      reason: trim(payload.reason),
    } as T
  }

  return {
    type: 'carta-vacaciones',
    ...base,
    periodStart: trim(payload.periodStart),
    periodEnd: trim(payload.periodEnd),
    days: trim(payload.days),
    vacationYear: trim(payload.vacationYear),
  } as T
}
