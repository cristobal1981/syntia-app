import {
  formatProfileChangeTicketChatterMessage,
  formatProfileChangeTicketOdooDescriptionHtml,
} from '@/src/modules/profile/domain/format-profile-change-ticket-description'
import type { ProfileChangeLineItem, ProfileFieldChange } from '@/src/modules/profile/domain/types'
import { getOdooModelForRecordKind } from '@/src/modules/portal/infrastructure/portal-record-access'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { postRecordComment } from '@/src/modules/portal/infrastructure/odoo-messages-repository'
import { createPartnerTicket } from '@/src/modules/tramites/infrastructure/odoo-create-ticket-repository'

export type ProfileChangeTicketErrorCode = 'odoo_unavailable' | 'create_failed'

export type ProfileChangeTicketResult =
  | { ok: true; ticketId: number }
  | { ok: false; error: ProfileChangeTicketErrorCode }

const SUBJECT_MAX_LENGTH = 120

function truncateSubject(subject: string): string {
  const trimmed = subject.trim()
  if (trimmed.length <= SUBJECT_MAX_LENGTH) {
    return trimmed
  }
  return `${trimmed.slice(0, SUBJECT_MAX_LENGTH - 1)}…`
}

export async function createProfileChangeTicketInOdoo(input: {
  partnerId: number
  subject: string
  clientName: string
  clientEmail: string
  changes: ProfileFieldChange[]
  lineItems: ProfileChangeLineItem[]
  requestedAt: string
}): Promise<ProfileChangeTicketResult> {
  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  const subject = truncateSubject(input.subject)
  const description = formatProfileChangeTicketOdooDescriptionHtml(input.lineItems)
  const htmlBody = formatProfileChangeTicketChatterMessage({
    clientName: input.clientName,
    clientEmail: input.clientEmail,
    changes: input.changes,
    requestedAt: input.requestedAt,
  })

  try {
    const ticketId = await createPartnerTicket({
      partnerId: input.partnerId,
      subject,
      description,
    })

    await postRecordComment({
      resModel: getOdooModelForRecordKind('ticket'),
      recordId: ticketId,
      clientPartnerId: input.partnerId,
      htmlBody,
    })

    return { ok: true, ticketId }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ODOO_TICKET_TEAM_NOT_CONFIGURED') {
        console.error('[profile-change] ODOO_TICKET_TEAM_ID is not configured')
        return { ok: false, error: 'odoo_unavailable' }
      }
      if (error.message === 'ODOO_TICKET_CREATE_FAILED') {
        console.error('[profile-change] Odoo ticket create returned no id')
        return { ok: false, error: 'create_failed' }
      }
      if (error.message === 'ODOO_MESSAGE_CREATE_FAILED') {
        console.error('[profile-change] ticket created but chatter comment failed')
        return { ok: false, error: 'create_failed' }
      }
    }

    console.error('[profile-change] unexpected Odoo failure:', error)
    return { ok: false, error: 'odoo_unavailable' }
  }
}
