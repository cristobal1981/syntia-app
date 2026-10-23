import {
  mapOdooMany2OneId,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

export type OdooUserSummary = {
  /** `res.partner` del usuario, si lo tiene. */
  partnerId: number | null
  name: string
}

const memoryUserById = new Map<number, OdooUserSummary>()

/**
 * Una sola search_read para varios usuarios (p. ej. al cargar la lista de
 * trámites): su partner (para avisar en el chatter) y su nombre (para enseñar
 * quién lo lleva). Se recuerdan en memoria; un usuario que no existe se omite.
 */
export async function resolveOdooUsersByIds(
  odooUserIds: number[]
): Promise<Map<number, OdooUserSummary>> {
  const result = new Map<number, OdooUserSummary>()
  const unique = [
    ...new Set(odooUserIds.filter((id) => Number.isInteger(id) && id > 0)),
  ]
  if (!unique.length) return result

  const missing: number[] = []
  for (const userId of unique) {
    const known = memoryUserById.get(userId)
    if (known) result.set(userId, known)
    else missing.push(userId)
  }

  if (missing.length) {
    const rows = await odooSearchRead<{
      id: number
      name?: string | false | null
      partner_id?: [number, string] | false | null
    }>('res.users', {
      domain: [['id', 'in', missing]],
      fields: ['partner_id', 'name'],
      limit: missing.length,
    })

    for (const row of rows) {
      const partnerId = mapOdooMany2OneId(row.partner_id)
      const summary: OdooUserSummary = {
        partnerId: partnerId && partnerId > 0 ? partnerId : null,
        name: typeof row.name === 'string' ? row.name.trim() : '',
      }
      memoryUserById.set(row.id, summary)
      result.set(row.id, summary)
    }
  }

  return result
}
