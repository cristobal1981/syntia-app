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

export function getOdooTicketTeamId(): number | null {
  const raw = process.env.ODOO_TICKET_TEAM_ID?.trim()
  if (!raw) return null

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}
