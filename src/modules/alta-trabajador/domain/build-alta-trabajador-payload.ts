import type { AltaTrabajadorFormValues } from '@/src/modules/alta-trabajador/domain/alta-trabajador-form-types'
import type { PortalChatterUploadFile } from '@/src/modules/portal/domain/portal-chatter-types'
import type { TrabajadorAltaPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'
import { unionWeekdaysCsv } from '@/lib/weekdays'

const CONTRACT_TYPES_WITH_END_DATE_ALWAYS = new Set(['formacion', 'otros'])
const TEMPORARY_REASONS_WITH_END_DATE = new Set(['incremento_tareas', 'otras_causas'])

export function showsPartialWeeklyHours(values: AltaTrabajadorFormValues): boolean {
  return values.workSchedule === 'parcial'
}

export function showsGrossSalary(values: AltaTrabajadorFormValues): boolean {
  return values.salaryType === 'pactado'
}

export function showsTemporaryReasonFields(values: AltaTrabajadorFormValues): boolean {
  return values.contractType === 'temporal'
}

export function showsTemporaryIncreaseFields(values: AltaTrabajadorFormValues): boolean {
  return values.contractType === 'temporal' && values.temporaryReason === 'incremento_tareas'
}

export function showsVacationSubstitutionFields(
  values: AltaTrabajadorFormValues
): boolean {
  return values.contractType === 'temporal' && values.temporaryReason === 'sustitucion_vacaciones'
}

export function showsSubstituteEmployeeField(values: AltaTrabajadorFormValues): boolean {
  return (
    values.contractType === 'temporal' &&
    (values.temporaryReason === 'sustitucion_it' ||
      values.temporaryReason === 'sustitucion_paternidad_maternidad')
  )
}

export function showsOtherTemporaryReasonFields(
  values: AltaTrabajadorFormValues
): boolean {
  return values.contractType === 'temporal' && values.temporaryReason === 'otras_causas'
}

export function showsTrainingFields(values: AltaTrabajadorFormValues): boolean {
  return values.contractType === 'formacion'
}

export function showsTrainingScholarshipAmount(
  values: AltaTrabajadorFormValues
): boolean {
  return values.contractType === 'formacion' && values.trainingHasScholarship === 'si'
}

export function showsOtherContractReasonFields(
  values: AltaTrabajadorFormValues
): boolean {
  return values.contractType === 'otros'
}

export function showsContractEndDate(values: AltaTrabajadorFormValues): boolean {
  if (CONTRACT_TYPES_WITH_END_DATE_ALWAYS.has(values.contractType)) return true
  if (values.contractType === 'temporal') {
    return TEMPORARY_REASONS_WITH_END_DATE.has(values.temporaryReason)
  }
  return false
}

export function showsTeleworkFields(values: AltaTrabajadorFormValues): boolean {
  return values.isTelework === 'si'
}

export function showsTeleworkScheduleSplit(values: AltaTrabajadorFormValues): boolean {
  return showsTeleworkFields(values) && values.teleworkFullTime === 'no'
}

export function showsIdentityDocument(values: AltaTrabajadorFormValues): boolean {
  return values.requiresWorkAuthorization === 'si'
}

/** Cuando el trabajador reparte la semana entre teletrabajo y presencial, los días de
 * trabajo semanal ya quedan definidos por esa combinación: no se vuelven a preguntar. */
export function showsDerivedWorkDays(values: AltaTrabajadorFormValues): boolean {
  return showsTeleworkScheduleSplit(values)
}

export function deriveWorkDaysFromTelework(values: AltaTrabajadorFormValues): string {
  return unionWeekdaysCsv(values.teleworkDaysRemote, values.teleworkDaysOnsite)
}

function optional(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

export function buildAltaTrabajadorPayload(
  values: AltaTrabajadorFormValues,
  attachment?: PortalChatterUploadFile | null
): TrabajadorAltaPayload {
  return {
    type: 'alta-trabajador',
    firstName: values.firstName,
    lastName: values.lastName,
    fullName: `${values.firstName} ${values.lastName}`.trim(),
    dni: values.dni,
    naf: values.naf,
    email: values.email,
    phone: values.phone,
    iban: values.iban,

    birthDate: values.birthDate,
    addressStreet: values.addressStreet,
    addressNumber: values.addressNumber,
    addressCity: values.addressCity,
    addressProvince: values.addressProvince,
    addressPostalCode: values.addressPostalCode,

    startDate: values.startDate,
    workCenter: values.workCenter,
    position: values.position,
    jobDuties: values.jobDuties,
    sepeOccupationCode: values.sepeOccupationCode,
    studiesLevel: values.studiesLevel,

    contractType: values.contractType,
    ...(showsTemporaryReasonFields(values) ? { temporaryReason: values.temporaryReason } : {}),
    ...(showsTemporaryIncreaseFields(values)
      ? {
          temporaryIncreaseCauses: optional(values.temporaryIncreaseCauses),
          temporaryDurationReason: optional(values.temporaryDurationReason),
        }
      : {}),
    ...(showsVacationSubstitutionFields(values)
      ? { vacationSubstitutionDetails: optional(values.vacationSubstitutionDetails) }
      : {}),
    ...(showsSubstituteEmployeeField(values)
      ? { employeeToSubstitute: optional(values.employeeToSubstitute) }
      : {}),
    ...(showsOtherTemporaryReasonFields(values)
      ? { otherTemporaryReasonDetail: optional(values.otherTemporaryReasonDetail) }
      : {}),
    ...(showsTrainingFields(values)
      ? {
          trainingType: values.trainingType,
          trainingHasScholarship: values.trainingHasScholarship,
        }
      : {}),
    ...(showsTrainingScholarshipAmount(values)
      ? {
          trainingScholarshipAmount: optional(values.trainingScholarshipAmount),
          trainingScholarshipPayer: optional(values.trainingScholarshipPayer),
        }
      : {}),
    ...(showsOtherContractReasonFields(values)
      ? { otherContractReason: optional(values.otherContractReason) }
      : {}),
    ...(showsContractEndDate(values) && values.contractEndDate.trim()
      ? { contractEndDate: values.contractEndDate.trim() }
      : {}),

    isTelework: values.isTelework,
    ...(showsTeleworkFields(values)
      ? {
          teleworkAddressStreet: values.teleworkAddressStreet,
          teleworkAddressNumber: values.teleworkAddressNumber,
          teleworkAddressCity: values.teleworkAddressCity,
          teleworkAddressProvince: values.teleworkAddressProvince,
          teleworkAddressPostalCode: values.teleworkAddressPostalCode,
          teleworkEquipment: values.teleworkEquipment,
          teleworkAmountAgreed: values.teleworkAmountAgreed,
          teleworkFullTime: values.teleworkFullTime,
          ...(showsTeleworkScheduleSplit(values)
            ? {
                teleworkDaysRemote: values.teleworkDaysRemote,
                teleworkDaysOnsite: values.teleworkDaysOnsite,
              }
            : {}),
        }
      : {}),

    salaryType: values.salaryType,
    ...(showsGrossSalary(values) ? { grossSalary: values.grossSalary } : {}),
    workSchedule: values.workSchedule,
    ...(showsPartialWeeklyHours(values) && values.partialWeeklyHours.trim()
      ? { partialWeeklyHours: values.partialWeeklyHours.trim() }
      : {}),
    workDays: values.workDays,
    workHoursDescription: values.workHoursDescription,
    workScheduleNotes: values.workScheduleNotes,

    observations: values.observations.trim(),
    requiresWorkAuthorization: values.requiresWorkAuthorization,
    ...(showsIdentityDocument(values) && attachment ? { identityDocument: attachment } : {}),
  }
}
