export const TRAMITES_PAGE_SIZE = 15
export const TRAMITES_FETCH_LIMIT = 200

export function getTramitesTaskTagName(): string | undefined {
  const value = process.env.ODOO_TRAMITES_TASK_TAG?.trim()
  return value || undefined
}

export function getOdooTicketsModel(): string {
  return process.env.ODOO_TICKETS_MODEL?.trim() || 'helpdesk.ticket'
}

export function getTicketClosedField(): string {
  return process.env.ODOO_TICKET_CLOSED_FIELD?.trim() || 'close_date'
}
