import type { PortalChatterUploadFile } from '@/src/modules/portal/domain/portal-chatter-types'

export type ProcedureTicketType =
  | 'alta-trabajador'
  | 'baja-trabajador'
  | 'carta-vacaciones'

export type SolicitudPickerId = ProcedureTicketType | 'general'

export type TrabajadorAltaPayload = {
  type: 'alta-trabajador'
  firstName: string
  lastName: string
  fullName: string
  dni: string
  naf: string
  email: string
  phone: string
  iban: string

  birthDate: string
  addressStreet: string
  addressNumber: string
  addressCity: string
  addressProvince: string
  addressPostalCode: string

  startDate: string
  workCenter: string
  position: string
  jobDuties: string
  sepeOccupationCode: string
  studiesLevel: string

  contractType: string
  temporaryReason?: string
  temporaryIncreaseCauses?: string
  temporaryDurationReason?: string
  vacationSubstitutionDetails?: string
  employeeToSubstitute?: string
  otherTemporaryReasonDetail?: string
  trainingType?: string
  trainingHasScholarship?: string
  trainingScholarshipAmount?: string
  trainingScholarshipPayer?: string
  otherContractReason?: string
  contractEndDate?: string

  isTelework: string
  teleworkAddressStreet?: string
  teleworkAddressNumber?: string
  teleworkAddressCity?: string
  teleworkAddressProvince?: string
  teleworkAddressPostalCode?: string
  teleworkEquipment?: string
  teleworkAmountAgreed?: string
  teleworkFullTime?: string
  teleworkDaysRemote?: string
  teleworkDaysOnsite?: string

  salaryType: string
  grossSalary?: string
  workSchedule: string
  partialWeeklyHours?: string
  workDays: string
  workHoursDescription: string
  workScheduleNotes: string

  observations: string
  requiresWorkAuthorization: string
  /** Adjunto de documentación identificativa (obligatorio solo si `requiresWorkAuthorization === 'si'`). */
  identityDocument?: PortalChatterUploadFile
}

export type TrabajadorBajaPayload = {
  type: 'baja-trabajador'
  fullName: string
  dni: string
  endDate: string
  reason: string
  observations: string
}

export type CartaVacacionesPayload = {
  type: 'carta-vacaciones'
  fullName: string
  dni: string
  periodStart: string
  periodEnd: string
  days: string
  vacationYear: string
  observations: string
}

export type ProcedureTicketPayload =
  | TrabajadorAltaPayload
  | TrabajadorBajaPayload
  | CartaVacacionesPayload
