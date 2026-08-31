'use server'

import type { GenericProcedureTicketPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'
import type { ProcedureFieldErrorKey } from '@/src/modules/tramites/domain/validate-procedure-ticket'
import { createStructuredProcedureRecord } from '@/src/modules/tramites/application/create-structured-procedure-record'

export type CreateProcedureTicketResult =
  | {
      ok: true
      recordId: number
      name: string
      /** @deprecated Usar recordId */
      ticketId: number
    }
  | {
      ok: false
      error:
        | 'forbidden'
        | 'not_linked'
        | 'odoo_unavailable'
        | 'validation'
        | 'create_failed'
      fieldErrors?: Record<string, ProcedureFieldErrorKey>
    }

export async function createProcedureTicketAction(
  payload: GenericProcedureTicketPayload
): Promise<CreateProcedureTicketResult> {
  const result = await createStructuredProcedureRecord({
    payload,
    recordKind: 'ticket',
    postChatterMessage: true,
  })

  if (!result.ok) return result

  return { ...result, ticketId: result.recordId }
}
