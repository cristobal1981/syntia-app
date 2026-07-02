import {
  mapOdooMany2OneId,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

const memoryPartnerByUserId = new Map<number, number | null>()

/** res.partner.id del asesor a partir de res.users.id (memoria de proceso). */
export async function resolveOdooPartnerIdFromUserIdCached(
  odooUserId: number
): Promise<number | null> {
  const map = await resolveOdooPartnerIdsByUserIds([odooUserId])
  return map.get(odooUserId) ?? null
}

/** Una sola search_read para varios users (p. ej. al cargar lista de trámites). */
export async function resolveOdooPartnerIdsByUserIds(
  odooUserIds: number[]
): Promise<Map<number, number>> {
  const result = new Map<number, number>()
  const unique = [
    ...new Set(odooUserIds.filter((id) => Number.isInteger(id) && id > 0)),
  ]
  if (!unique.length) return result

  const missing: number[] = []
  for (const userId of unique) {
    if (memoryPartnerByUserId.has(userId)) {
      const partnerId = memoryPartnerByUserId.get(userId)
      if (partnerId && partnerId > 0) result.set(userId, partnerId)
    } else {
      missing.push(userId)
    }
  }

  if (missing.length) {
    const rows = await odooSearchRead<{
      id: number
      partner_id?: [number, string] | false | null
    }>('res.users', {
      domain: [['id', 'in', missing]],
      fields: ['partner_id'],
      limit: missing.length,
    })

    for (const row of rows) {
      const partnerId = mapOdooMany2OneId(row.partner_id)
      memoryPartnerByUserId.set(row.id, partnerId && partnerId > 0 ? partnerId : null)
      if (partnerId && partnerId > 0) result.set(row.id, partnerId)
    }
  }

  return result
}
