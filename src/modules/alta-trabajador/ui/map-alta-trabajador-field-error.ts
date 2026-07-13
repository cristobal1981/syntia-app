import { tramiteSolicitudes } from '@/content/tramite-solicitudes'
import type { ProcedureFieldErrorKey } from '@/src/modules/tramites/domain/validate-procedure-ticket'

export function mapAltaTrabajadorFieldError(key: ProcedureFieldErrorKey): string {
  return tramiteSolicitudes.errors[key] ?? tramiteSolicitudes.errors.unknown
}
