export type ProcedureTicketType =
  | 'alta-trabajador'
  | 'baja-trabajador'
  | 'carta-vacaciones'

export type SolicitudPickerId = ProcedureTicketType | 'general'

export type TrabajadorAltaPayload = {
  type: 'alta-trabajador'
  fullName: string
  dni: string
  startDate: string
  contractType: string
  workSchedule: string
  position: string
  grossSalary: string
  observations: string
  /** Solo para descripción estructurada en Odoo. */
  partialWeeklyHours?: string
  contractEndDate?: string
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