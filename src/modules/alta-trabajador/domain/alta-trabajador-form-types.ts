export type AltaTrabajadorFormValues = {
  // datos-personales
  firstName: string
  lastName: string
  dni: string
  naf: string
  email: string
  phone: string
  iban: string

  // domicilio
  birthDate: string
  addressStreet: string
  addressNumber: string
  addressCity: string
  addressProvince: string
  addressPostalCode: string

  // puesto-ocupacion
  startDate: string
  workCenter: string
  position: string
  jobDuties: string
  sepeOccupationCode: string
  studiesLevel: string

  // contrato
  contractType: string
  temporaryReason: string
  temporaryIncreaseCauses: string
  temporaryDurationReason: string
  vacationSubstitutionDetails: string
  employeeToSubstitute: string
  otherTemporaryReasonDetail: string
  trainingType: string
  trainingHasScholarship: string
  trainingScholarshipAmount: string
  trainingScholarshipPayer: string
  otherContractReason: string
  contractEndDate: string

  // teletrabajo
  isTelework: string
  teleworkAddressStreet: string
  teleworkAddressNumber: string
  teleworkAddressCity: string
  teleworkAddressProvince: string
  teleworkAddressPostalCode: string
  teleworkEquipment: string
  teleworkAmountAgreed: string
  teleworkFullTime: string
  teleworkDaysRemote: string
  teleworkDaysOnsite: string

  // retribucion-horario
  salaryType: string
  grossSalary: string
  workSchedule: string
  partialWeeklyHours: string
  workDays: string
  workHoursDescription: string
  workScheduleNotes: string

  // documentacion
  observations: string
  requiresWorkAuthorization: string
}

export const EMPTY_ALTA_TRABAJADOR_FORM: AltaTrabajadorFormValues = {
  firstName: '',
  lastName: '',
  dni: '',
  naf: '',
  email: '',
  phone: '',
  iban: '',

  birthDate: '',
  addressStreet: '',
  addressNumber: '',
  addressCity: '',
  addressProvince: '',
  addressPostalCode: '',

  startDate: '',
  workCenter: '',
  position: '',
  jobDuties: '',
  sepeOccupationCode: '',
  studiesLevel: '',

  contractType: '',
  temporaryReason: '',
  temporaryIncreaseCauses: '',
  temporaryDurationReason: '',
  vacationSubstitutionDetails: '',
  employeeToSubstitute: '',
  otherTemporaryReasonDetail: '',
  trainingType: '',
  trainingHasScholarship: '',
  trainingScholarshipAmount: '',
  trainingScholarshipPayer: '',
  otherContractReason: '',
  contractEndDate: '',

  isTelework: '',
  teleworkAddressStreet: '',
  teleworkAddressNumber: '',
  teleworkAddressCity: '',
  teleworkAddressProvince: '',
  teleworkAddressPostalCode: '',
  teleworkEquipment: '',
  teleworkAmountAgreed: '',
  teleworkFullTime: '',
  teleworkDaysRemote: '',
  teleworkDaysOnsite: '',

  salaryType: '',
  grossSalary: '',
  workSchedule: '',
  partialWeeklyHours: '',
  workDays: '',
  workHoursDescription: '',
  workScheduleNotes: '',

  observations: '',
  requiresWorkAuthorization: '',
}
