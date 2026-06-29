'use server'

import { updateTag } from 'next/cache'

import { validateChatterHtmlBody, stripHtmlToText } from '@/src/modules/portal/domain/filter-portal-messages'
import { getOdooModelForRecordKind } from '@/src/modules/portal/infrastructure/portal-record-access'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { postRecordComment } from '@/src/modules/portal/infrastructure/odoo-messages-repository'
import { CHATTER_MESSAGE_MAX_LENGTH } from '@/src/modules/portal/infrastructure/portal-chatter-env'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'
import { tramitesSnapshotCacheTag } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import { createPartnerTicket } from '@/src/modules/tramites/infrastructure/odoo-create-ticket-repository'
import { getSession } from '@/src/modules/auth/application/get-session'

const SUBJECT_MAX_LENGTH = 120

export type CreateTicketResult =
  | { ok: true; ticketId: number; name: string }
  | {
      ok: false
      error:
        | 'forbidden'
        | 'not_linked'
        | 'odoo_unavailable'
        | 'validation'
        | 'create_failed'
      fieldErrors?: Record<string, string>
    }

function validateSubject(subject: string): { ok: true; value: string } | { ok: false } {
  const value = subject.trim()
  if (!value) return { ok: false }
  if (value.length > SUBJECT_MAX_LENGTH) return { ok: false }
  return { ok: true, value }
}

export async function createTicketAction(input: {
  subject: string
  body: string
}): Promise<CreateTicketResult> {
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

  const subjectResult = validateSubject(input.subject)
  const bodyResult = validateChatterHtmlBody(input.body, CHATTER_MESSAGE_MAX_LENGTH)

  const fieldErrors: Record<string, string> = {}
  if (!subjectResult.ok) {
    fieldErrors.subject =
      input.subject.trim().length > SUBJECT_MAX_LENGTH
        ? 'subjectTooLong'
        : 'subjectRequired'
  }
  if (!bodyResult.ok) {
    const textLength = stripHtmlToText(input.body).trim().length
    fieldErrors.body =
      textLength > CHATTER_MESSAGE_MAX_LENGTH ? 'bodyTooLong' : 'bodyRequired'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: 'validation', fieldErrors }
  }

  if (!subjectResult.ok || !bodyResult.ok) {
    return { ok: false, error: 'validation', fieldErrors }
  }

  const subject = subjectResult.value
  const htmlBody = bodyResult.value

  try {
    const ticketId = await createPartnerTicket({
      partnerId,
      subject,
    })

    await postRecordComment({
      resModel: getOdooModelForRecordKind('ticket'),
      recordId: ticketId,
      clientPartnerId: partnerId,
      htmlBody,
    })

    updateTag(tramitesSnapshotCacheTag(partnerId))

    return {
      ok: true,
      ticketId,
      name: subject,
    }
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
