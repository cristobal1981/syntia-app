'use server'

import { getOdooModelForRecordKind } from '@/src/modules/portal/infrastructure/portal-record-access'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { postRecordComment } from '@/src/modules/portal/infrastructure/odoo-messages-repository'
import { getSession } from '@/src/modules/auth/application/get-session'
import {
  formatProcedureTicketChatterMessage,
  formatProcedureTicketOdooDescriptionHtml,
  formatProcedureTicketSubject,
} from '@/src/modules/tramites/domain/format-procedure-ticket'
import type { ProcedureTicketPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'
import {
  normalizeProcedureTicketPayload,
  validateProcedureTicketPayload,
  type ProcedureFieldErrorKey,
} from '@/src/modules/tramites/domain/validate-procedure-ticket'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'
import { createPartnerTicket } from '@/src/modules/tramites/infrastructure/odoo-create-ticket-repository'

export type CreateProcedureTicketResult =
  | { ok: true; ticketId: number; name: string }
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
  payload: ProcedureTicketPayload
): Promise<CreateProcedureTicketResult> {
  const session = await getSession()
  if (!session || session.user.role !== 'client') {
    return { ok: false, error: 'forbidden' }
  }

  const partnerId = await resolveClientOdooPartnerId(session.user)
  if (!partnerId) {
    return { ok: false, error: 'not_linked' }
  }

  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  const normalized = normalizeProcedureTicketPayload(payload)
  const fieldErrors = validateProcedureTicketPayload(normalized)

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: 'validation', fieldErrors }
  }

  const subject = formatProcedureTicketSubject(normalized)
  const description = formatProcedureTicketOdooDescriptionHtml(normalized)
  const requestedAt = new Date().toISOString()
  const htmlBody = formatProcedureTicketChatterMessage({
    payload: normalized,
    requestedAt,
  })

  try {
    const ticketId = await createPartnerTicket({
      partnerId,
      subject,
      description,
    })

    await postRecordComment({
      resModel: getOdooModelForRecordKind('ticket'),
      recordId: ticketId,
      clientPartnerId: partnerId,
      htmlBody,
    })

    return { ok: true, ticketId, name: subject }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ODOO_TICKET_TEAM_NOT_CONFIGURED') {
        return { ok: false, error: 'odoo_unavailable' }
      }
      if (error.message === 'ODOO_TICKET_CREATE_FAILED') {
        return { ok: false, error: 'create_failed' }
      }
    }
    return { ok: false, error: 'odoo_unavailable' }
  }
}
