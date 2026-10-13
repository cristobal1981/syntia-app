import { odooCall } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { getReportProblemAssigneeUserId } from '@/src/modules/portal/infrastructure/report-problem-env'
import {
  getOdooTicketTeamId,
  getOdooTicketsModel,
} from '@/src/modules/tramites/infrastructure/tramites-env'

function parseOdooCreatedId(result: number | number[] | undefined): number | null {
  if (typeof result === 'number' && result > 0) return result
  if (Array.isArray(result) && typeof result[0] === 'number' && result[0] > 0) {
    return result[0]
  }
  return null
}

export async function createReportProblemTicket(input: {
  name: string
  descriptionHtml: string
  reporterName: string
  reporterEmail: string
}): Promise<number> {
  const teamId = getOdooTicketTeamId()
  if (!teamId) {
    throw new Error('ODOO_TICKET_TEAM_NOT_CONFIGURED')
  }

  const assigneeUserId = getReportProblemAssigneeUserId()
  const model = getOdooTicketsModel()

  const created = await odooCall<number | number[]>(model, 'create', {
    vals_list: [
      {
        name: input.name,
        description: input.descriptionHtml,
        team_id: teamId,
        ...(assigneeUserId ? { user_id: assigneeUserId } : {}),
        partner_name: input.reporterName,
        partner_email: input.reporterEmail,
      },
    ],
  })

  const ticketId = parseOdooCreatedId(created)
  if (!ticketId) {
    throw new Error('ODOO_TICKET_CREATE_FAILED')
  }

  return ticketId
}
