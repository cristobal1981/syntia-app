'use server'

import type { TrabajadorAltaPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'
import type { ProcedureFieldErrorKey } from '@/src/modules/tramites/domain/validate-procedure-ticket'
import { createStructuredProcedureRecord } from '@/src/modules/tramites/application/create-structured-procedure-record'

export type CreateAltaTrabajadorTaskResult =
  | {
      ok: true
      recordId: number
      name: string
    }
  | {
      ok: false
      error: 'forbidden' | 'not_linked' | 'odoo_unavailable' | 'validation' | 'create_failed'
      fieldErrors?: Record<string, ProcedureFieldErrorKey>
    }

/**
 * A diferencia de `createProcedureTicketAction` (baja-trabajador/carta-vacaciones),
 * esta acción NO postea el resumen como mensaje de chatter: duplicaba la
 * descripción de la task (uso interno del gestor) como un mensaje más en el
 * chat de Syntia, visible para el titular sin aportar nada nuevo.
 */
export async function createAltaTrabajadorTaskAction(
  payload: TrabajadorAltaPayload
): Promise<CreateAltaTrabajadorTaskResult> {
  return createStructuredProcedureRecord({
    payload,
    recordKind: 'task',
    postChatterMessage: false,
    identityAttachment: payload.identityDocument ?? null,
  })
}
