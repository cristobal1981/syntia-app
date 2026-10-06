import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import { tramites } from '@/content/tramites'
import type {
  ProcedureTicketType,
  SolicitudPickerId,
} from '@/src/modules/tramites/domain/procedure-ticket-types'
import type { ProcedureFieldErrorKey } from '@/src/modules/tramites/domain/validate-procedure-ticket'
import type { CartaVacacionesFormValues } from '@/src/modules/tramites/ui/tramite-carta-vacaciones-form'
import type { TrabajadorFormValues } from '@/src/modules/tramites/ui/tramite-trabajador-form'

export type DrawerStep = 'picker' | SolicitudPickerId

export const GENERAL_FORM_ID = 'tramite-general-consulta-form'
export const PROCEDURE_FORM_ID = 'tramite-procedure-form'

export const generalCopy = tramites.createConsulta
export const generalErrorCopy = generalCopy.errors
export const solicitudCopy = tramiteSolicitudes
export const solicitudErrorCopy = solicitudCopy.errors

export function successMessageForStep(step: DrawerStep): string {
  if (step === 'general') return generalCopy.drawer.successToast
  if (step === 'baja-trabajador') return solicitudCopy.bajaTrabajador.successToast
  if (step === 'carta-vacaciones') return solicitudCopy.cartaVacaciones.successToast
  return solicitudCopy.common.successToast
}

export function mapGeneralFieldError(key: string): string {
  if (key === 'subjectRequired') return generalErrorCopy.subjectRequired
  if (key === 'subjectTooLong') return generalErrorCopy.subjectTooLong
  if (key === 'bodyRequired') return generalErrorCopy.bodyRequired
  if (key === 'bodyTooLong') return generalErrorCopy.bodyTooLong
  return generalErrorCopy.unknown
}

export function mapProcedureFieldError(key: ProcedureFieldErrorKey): string {
  return solicitudErrorCopy[key] ?? solicitudErrorCopy.unknown
}

export function mapGeneralActionError(
  error: 'forbidden' | 'not_linked' | 'odoo_unavailable' | 'create_failed' | 'rate_limited'
): string {
  if (error === 'forbidden') return generalErrorCopy.forbidden
  if (error === 'not_linked') return generalErrorCopy.not_linked
  if (error === 'create_failed') return generalErrorCopy.create_failed
  if (error === 'rate_limited') return generalErrorCopy.rate_limited
  return generalErrorCopy.odoo_unavailable
}

export function mapProcedureActionError(
  error: 'forbidden' | 'not_linked' | 'odoo_unavailable' | 'create_failed' | 'rate_limited'
): string {
  if (error === 'forbidden') return solicitudErrorCopy.forbidden
  if (error === 'not_linked') return solicitudErrorCopy.not_linked
  if (error === 'create_failed') return solicitudErrorCopy.create_failed
  if (error === 'rate_limited') return solicitudErrorCopy.rate_limited
  return solicitudErrorCopy.odoo_unavailable
}

export function procedureStepFromInitial(
  initialProcedure?: ProcedureTicketType | null
): DrawerStep {
  if (initialProcedure === 'alta-trabajador') return 'picker'
  return initialProcedure ?? 'picker'
}

export function trabajadorFormHasContent(values: TrabajadorFormValues): boolean {
  return Object.values(values).some((value) => value.trim().length > 0)
}

export function cartaFormHasContent(values: CartaVacacionesFormValues): boolean {
  return Object.values(values).some((value) => value.trim().length > 0)
}
