export type AltaTrabajadorFormValues = {
  fullName: string
  dni: string
  startDate: string
  contractType: string
  workSchedule: string
  partialWeeklyHours: string
  contractEndDate: string
  position: string
  grossSalary: string
  observations: string
}

export const EMPTY_ALTA_TRABAJADOR_FORM: AltaTrabajadorFormValues = {
  fullName: '',
  dni: '',
  startDate: '',
  contractType: '',
  workSchedule: '',
  partialWeeklyHours: '',
  contractEndDate: '',
  position: '',
  grossSalary: '',
  observations: '',
}
