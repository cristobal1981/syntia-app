import type { PortalChatterUploadFile } from '@/src/modules/portal/domain/portal-chatter-types'

export type ProcedureTicketType =
  | 'alta-trabajador'
  | 'baja-trabajador'
  | 'carta-vacaciones'
  | 'baja-autonomo'
  | 'baja-servicio'

export type SolicitudPickerId = ProcedureTicketType | 'general'

/**
 * Solicitudes DESACTIVADAS A PROPÓSITO en «Nueva solicitud»: baja de trabajador
 * y carta de vacaciones hasta su lanzamiento, y el alta de trabajador (wizard
 * de `/alta-trabajador`) por decisión de producto mientras solo se ofrecen la
 * consulta general y las bajas de autónomo y de servicio. NO es código muerto: formularios, validación, payloads,
 * acciones y tests se conservan para reactivarlos; para volver a ofrecer una
 * basta con quitarla de aquí (la ruta `/alta-trabajador` y los accesos lo
 * siguen). No borrar en limpiezas de código sin uso; ver CLAUDE.md.
 */
const UNAVAILABLE_PROCEDURE_TYPES: ReadonlySet<ProcedureTicketType> = new Set([
  'alta-trabajador',
  'baja-trabajador',
  'carta-vacaciones',
])

export function isProcedureTypeAvailable(type: ProcedureTicketType): boolean {
  return !UNAVAILABLE_PROCEDURE_TYPES.has(type)
}

const ALL_PROCEDURE_TYPES: readonly ProcedureTicketType[] = [
  'alta-trabajador',
  'baja-trabajador',
  'carta-vacaciones',
  'baja-autonomo',
  'baja-servicio',
]

/** Hay alguna solicitud estructurada que ofrecer además de la consulta general. */
export function hasAvailableProcedureTypes(): boolean {
  return ALL_PROCEDURE_TYPES.some(isProcedureTypeAvailable)
}

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

type CartaVacacionesPayload = {
  type: 'carta-vacaciones'
  fullName: string
  dni: string
  periodStart: string
  periodEnd: string
  days: string
  vacationYear: string
  observations: string
}

/**
 * Baja del propio autónomo (titular de la cuenta): no lleva datos de persona
 * porque el ticket ya cuelga del cliente. `desiredDate` es la fecha en la que
 * quiere que se tramite; la de la petición la fija el servidor (hoy).
 */
export type BajaAutonomoPayload = {
  type: 'baja-autonomo'
  desiredDate: string
  reason: string
  observations: string
}

/** Baja de un servicio contratado con la asesoría (`service` es una clave de `BAJA_SERVICIO_OPTIONS`). */
export type BajaServicioPayload = {
  type: 'baja-servicio'
  service: string
  desiredDate: string
  observations: string
}

/** Solicitudes sobre una persona concreta (trabajador): llevan nombre y DNI. */
export type WorkerProcedurePayload = TrabajadorBajaPayload | CartaVacacionesPayload

export type ProcedureTicketPayload =
  | TrabajadorAltaPayload
  | TrabajadorBajaPayload
  | CartaVacacionesPayload
  | BajaAutonomoPayload
  | BajaServicioPayload

/** Tipos que siguen creando un ticket genérico vía `createProcedureTicketAction`
 * (con mensaje de chatter). Alta-trabajador tiene su propio método,
 * `createAltaTrabajadorTaskAction` — ver esa acción para el motivo. */
export type GenericProcedureTicketPayload =
  | TrabajadorBajaPayload
  | CartaVacacionesPayload
  | BajaAutonomoPayload
  | BajaServicioPayload
