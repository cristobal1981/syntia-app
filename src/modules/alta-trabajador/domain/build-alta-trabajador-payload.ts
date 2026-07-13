import type { AltaTrabajadorFormValues } from '@/src/modules/alta-trabajador/domain/alta-trabajador-form-types'
import type { TrabajadorAltaPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'

const CONTRACT_TYPES_WITH_END_DATE = new Set(['temporal', 'obra_servicio'])

export function showsContractEndDate(values: AltaTrabajadorFormValues): boolean {
  return CONTRACT_TYPES_WITH_END_DATE.has(values.contractType)
}

export function showsPartialWeeklyHours(values: AltaTrabajadorFormValues): boolean {
  return values.workSchedule === 'parcial'
}

export function buildAltaTrabajadorPayload(
  values: AltaTrabajadorFormValues
): TrabajadorAltaPayload {
  return {
    type: 'alta-trabajador',
    fullName: values.fullName,
    dni: values.dni,
    startDate: values.startDate,
    contractType: values.contractType,
    workSchedule: values.workSchedule,
    position: values.position,
    grossSalary: values.grossSalary,
    observations: values.observations.trim(),
    ...(showsPartialWeeklyHours(values) && values.partialWeeklyHours.trim()
      ? { partialWeeklyHours: values.partialWeeklyHours.trim() }
      : {}),
    ...(showsContractEndDate(values) && values.contractEndDate.trim()
      ? { contractEndDate: values.contractEndDate.trim() }
      : {}),
  }
}
