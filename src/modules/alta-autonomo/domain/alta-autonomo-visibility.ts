import type { AltaAutonomoFormValues } from '@/src/modules/alta-autonomo/domain/alta-autonomo-form-types'

export function showsPreviousBajaDate(values: AltaAutonomoFormValues): boolean {
  return values.wasAutonomoBefore === 'yes'
}

export function showsEmployeesCount(values: AltaAutonomoFormValues): boolean {
  return values.willHaveEmployees === 'yes'
}

export function showsEuVatNumber(values: AltaAutonomoFormValues): boolean {
  return values.invoicesEu === 'yes'
}
