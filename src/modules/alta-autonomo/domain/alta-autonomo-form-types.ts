export type AltaAutonomoYesNo = '' | 'yes' | 'no'

export type AltaAutonomoFormValues = {
  wasAutonomoBefore: AltaAutonomoYesNo
  previousBajaDate: string
  willHaveEmployees: AltaAutonomoYesNo
  employeesCount: string
  fullName: string
  taxId: string
  email: string
  phone: string
  activityDescription: string
  startDate: string
  invoicesEu: AltaAutonomoYesNo
  euVatNumber: string
  observations: string
}

export const EMPTY_ALTA_AUTONOMO_FORM: AltaAutonomoFormValues = {
  wasAutonomoBefore: '',
  previousBajaDate: '',
  willHaveEmployees: '',
  employeesCount: '',
  fullName: '',
  taxId: '',
  email: '',
  phone: '',
  activityDescription: '',
  startDate: '',
  invoicesEu: '',
  euVatNumber: '',
  observations: '',
}
