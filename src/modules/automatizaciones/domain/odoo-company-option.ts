export type OdooCompanyOption = {
  id: number
  name: string
}

export type OdooCompanyRow = {
  id: number
  name?: string | false | null
  email?: string | false | null
}

function nonBlank(value: string | false | null | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

/** Sin nombre en Odoo se identifica por el correo; solo sin ambos queda «Sin nombre». */
export function mapOdooCompanyRow(row: OdooCompanyRow): OdooCompanyOption | null {
  if (!row.id || row.id <= 0) return null
  return { id: row.id, name: nonBlank(row.name) ?? nonBlank(row.email) ?? 'Sin nombre' }
}
