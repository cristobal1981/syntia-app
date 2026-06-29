import {
  applyFieldRule,
  isValidPositiveInteger,
  requireIsoDate,
  trim,
} from '@/lib/validation'
import type { AltaTrabajadorStepId } from '@/src/modules/alta-trabajador/domain/alta-trabajador-steps'
import type { AltaTrabajadorFormValues } from '@/src/modules/alta-trabajador/domain/alta-trabajador-form-types'
import {
  buildAltaTrabajadorPayload,
  showsContractEndDate,
  showsPartialWeeklyHours,
} from '@/src/modules/alta-trabajador/domain/build-alta-trabajador-payload'
import {
  validateProcedureTicketPayload,
  type ProcedureFieldErrorKey,
} from '@/src/modules/tramites/domain/validate-procedure-ticket'

export function validateAltaTrabajadorStep(
  stepId: AltaTrabajadorStepId,
  values: AltaTrabajadorFormValues
): Record<string, ProcedureFieldErrorKey> {
  const payload = buildAltaTrabajadorPayload(values)
  const allErrors = validateProcedureTicketPayload(payload)

  if (stepId === 'datos-trabajador') {
    return pickErrors(allErrors, ['fullName', 'dni'] as const)
  }

  if (stepId === 'contrato') {
    const fields = [
      'startDate',
      'contractType',
      'workSchedule',
      'position',
      'grossSalary',
    ] as const
    const errors = pickErrors(allErrors, fields)

    if (showsPartialWeeklyHours(values)) {
      const hours = trim(values.partialWeeklyHours)
      if (!hours) {
        errors.partialWeeklyHours = 'daysRequired'
      } else if (!isValidPositiveInteger(hours, { maxDigits: 2 })) {
        errors.partialWeeklyHours = 'daysInvalid'
      }
    }

    if (showsContractEndDate(values)) {
      applyFieldRule(
        errors,
        'contractEndDate',
        requireIsoDate(
          values.contractEndDate,
          'dateRequired',
          'dateInvalid'
        )
      )
    }

    return errors
  }

  if (stepId === 'observaciones') {
    return pickErrors(allErrors, ['observations'])
  }

  return allErrors
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
