import {
  getOdooTicketTeamId,
  getOdooTicketsModel,
} from '@/src/modules/tramites/infrastructure/tramites-env'
import { odooCall } from '@/src/modules/portal/infrastructure/odoo-json-client'

function parseOdooCreatedId(result: number | number[] | undefined): number | null {
  if (typeof result === 'number' && result > 0) return result
  if (Array.isArray(result) && typeof result[0] === 'number' && result[0] > 0) {
    return result[0]
  }
  return null
}

export async function createPartnerTicket(input: {
  partnerId: number
  subject: string
}): Promise<number> {
  const teamId = getOdooTicketTeamId()
  if (!teamId) {
    throw new Error('ODOO_TICKET_TEAM_NOT_CONFIGURED')
  }

  const model = getOdooTicketsModel()
  const created = await odooCall<number | number[]>(model, 'create', {
    vals_list: [
      {
        name: input.subject,
        partner_id: input.partnerId,
        team_id: teamId,
      },
    ],
  })

  const ticketId = parseOdooCreatedId(created)
  if (!ticketId) {
    throw new Error('ODOO_TICKET_CREATE_FAILED')
  }

  return ticketId
}
