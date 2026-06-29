export type ObligacionTask = {
  id: number
  name: string
  state?: string
  stageName?: string
  dateDeadline?: string
  attachmentCount: number
}

export type ObligacionPeriod = {
  key: string
  label: string
  tasks: ObligacionTask[]
}

export type ObligacionYear = {
  year: number
  label: string
  periods: ObligacionPeriod[]
}

export type ObligacionesSnapshot = {
  years: ObligacionYear[]
}

export type ObligacionesErrorCode =
  | 'forbidden'
  | 'not_linked'
  | 'odoo_unavailable'
  | 'odoo_rate_limited'

export type ObligacionesResult =
  | { ok: true; data: ObligacionesSnapshot }
  | { ok: false; error: ObligacionesErrorCode }
