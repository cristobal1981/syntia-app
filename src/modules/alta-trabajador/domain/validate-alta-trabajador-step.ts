import type { AltaTrabajadorStepId } from '@/src/modules/alta-trabajador/domain/alta-trabajador-steps'
import type { AltaTrabajadorFormValues } from '@/src/modules/alta-trabajador/domain/alta-trabajador-form-types'
import { buildAltaTrabajadorPayload } from '@/src/modules/alta-trabajador/domain/build-alta-trabajador-payload'
import {
  validateProcedureTicketPayload,
  type ProcedureFieldErrorKey,
} from '@/src/modules/tramites/domain/validate-procedure-ticket'

const STEP_FIELDS: Record<AltaTrabajadorStepId, readonly string[]> = {
  'datos-personales': ['firstName', 'lastName', 'dni', 'naf', 'email', 'phone', 'iban'],
  domicilio: [
    'birthDate',
    'addressStreet',
    'addressNumber',
    'addressCity',
    'addressProvince',
    'addressPostalCode',
  ],
  'puesto-ocupacion': [
    'startDate',
    'workCenter',
    'position',
    'jobDuties',
    'sepeOccupationCode',
    'studiesLevel',
  ],
  contrato: [
    'contractType',
    'temporaryReason',
    'temporaryIncreaseCauses',
    'temporaryDurationReason',
    'vacationSubstitutionDetails',
    'employeeToSubstitute',
    'otherTemporaryReasonDetail',
    'trainingType',
    'trainingHasScholarship',
    'trainingScholarshipAmount',
    'trainingScholarshipPayer',
    'otherContractReason',
    'contractEndDate',
  ],
  teletrabajo: [
    'isTelework',
    'teleworkAddressStreet',
    'teleworkAddressNumber',
    'teleworkAddressCity',
    'teleworkAddressProvince',
    'teleworkAddressPostalCode',
    'teleworkEquipment',
    'teleworkAmountAgreed',
    'teleworkFullTime',
    'teleworkDaysRemote',
    'teleworkDaysOnsite',
  ],
  'retribucion-horario': [
    'salaryType',
    'grossSalary',
    'workSchedule',
    'partialWeeklyHours',
    'workDays',
    'workHoursDescription',
  ],
  documentacion: ['observations', 'requiresWorkAuthorization', 'identityDocument'],
  resumen: [],
}

export function validateAltaTrabajadorStep(
  stepId: AltaTrabajadorStepId,
  values: AltaTrabajadorFormValues,
  attachment?: { name: string; mimetype: string; dataBase64: string } | null
): Record<string, ProcedureFieldErrorKey> {
  const payload = buildAltaTrabajadorPayload(values, attachment)
  const allErrors = validateProcedureTicketPayload(payload)

  if (stepId === 'resumen') return allErrors

  return pickErrors(allErrors, STEP_FIELDS[stepId])
}

function pickErrors(
  source: Record<string, ProcedureFieldErrorKey>,
  fields: readonly string[]
): Record<string, ProcedureFieldErrorKey> {
  const result: Record<string, ProcedureFieldErrorKey> = {}
  for (const field of fields) {
    if (source[field]) {
      result[field] = source[field]
    }
  }
  return result
}
