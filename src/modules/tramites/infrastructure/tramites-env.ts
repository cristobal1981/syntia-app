export function getTramitesTaskTagName(): string | undefined {
  const value = process.env.ODOO_TRAMITES_TASK_TAG?.trim()
  return value || undefined
}

export function getOdooTicketsModel(): string {
  return process.env.ODOO_TICKETS_MODEL?.trim() || 'helpdesk.ticket'
}
