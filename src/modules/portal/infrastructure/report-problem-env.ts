const DEFAULT_ASSIGNEE_USER_ID = 20

export function getReportProblemAssigneeUserId(): number | null {
  const raw = process.env.ODOO_REPORT_PROBLEM_USER_ID?.trim()
  if (!raw) return DEFAULT_ASSIGNEE_USER_ID

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}
