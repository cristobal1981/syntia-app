import { getChatterExcludedPartnerIds } from '@/src/modules/portal/infrastructure/portal-chatter-env'
import {
  mapOdooMany2OneId,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

export type PartnerAvatarPayload = {
  dataBase64: string
  mimetype: string
}

type OdooPartnerAvatarRow = {
  id: number
  image_128?: string | false | null
}

export type AdvisorPartnerIdByEmail = Record<string, number>

type OdooInternalUserRow = {
  partner_id?: [number, string] | false | null
  login?: string | false | null
  email?: string | false | null
}

function normalizeAdvisorEmail(value: string | false | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toLowerCase()
  return normalized || null
}

function registerAdvisorEmail(
  byEmail: AdvisorPartnerIdByEmail,
  email: string | null,
  partnerId: number
) {
  if (!email) return
  if (!(email in byEmail)) {
    byEmail[email] = partnerId
  }
}

export async function fetchPartnerAvatarFromOdoo(
  partnerId: number
): Promise<PartnerAvatarPayload | null> {
  const rows = await odooSearchRead<OdooPartnerAvatarRow>('res.partner', {
    domain: [['id', '=', partnerId]],
    fields: ['image_128'],
    limit: 1,
  })

  const image = rows[0]?.image_128
  if (typeof image !== 'string' || !image.trim()) {
    return null
  }

  return {
    dataBase64: image,
    mimetype: 'image/png',
  }
}

export async function fetchAdvisorPartnerIdsFromOdoo(): Promise<number[]> {
  const map = await fetchAdvisorPartnerIdByEmailFromOdoo()
  return [...new Set(Object.values(map))]
}

export async function fetchAdvisorPartnerIdByEmailFromOdoo(): Promise<AdvisorPartnerIdByEmail> {
  const excluded = new Set(getChatterExcludedPartnerIds())

  const rows = await odooSearchRead<OdooInternalUserRow>('res.users', {
    domain: [
      ['share', '=', false],
      ['active', '=', true],
    ],
    fields: ['partner_id', 'login', 'email'],
    limit: 200,
  })

  const byEmail: AdvisorPartnerIdByEmail = {}
  for (const row of rows) {
    const partnerId = mapOdooMany2OneId(row.partner_id)
    if (!partnerId || excluded.has(partnerId)) continue

    registerAdvisorEmail(byEmail, normalizeAdvisorEmail(row.login), partnerId)
    registerAdvisorEmail(byEmail, normalizeAdvisorEmail(row.email), partnerId)
  }

  return byEmail
}

export async function fetchAdvisorPartnerIdForEmail(
  email: string
): Promise<number | null> {
  const normalized = normalizeAdvisorEmail(email)
  if (!normalized) return null

  const excluded = new Set(getChatterExcludedPartnerIds())

  const rows = await odooSearchRead<OdooInternalUserRow>('res.users', {
    domain: [
      ['share', '=', false],
      ['active', '=', true],
      '|',
      ['login', 'ilike', normalized],
      ['email', 'ilike', normalized],
    ],
    fields: ['partner_id'],
    limit: 5,
  })

  for (const row of rows) {
    const partnerId = mapOdooMany2OneId(row.partner_id)
    if (!partnerId || excluded.has(partnerId)) continue
    return partnerId
  }

  return null
}

export async function isOdooInternalUserPartner(partnerId: number): Promise<boolean> {
  if (!Number.isInteger(partnerId) || partnerId <= 0) return false

  const excluded = new Set(getChatterExcludedPartnerIds())
  if (excluded.has(partnerId)) return false

  const rows = await odooSearchRead<{ id: number }>('res.users', {
    domain: [
      ['partner_id', '=', partnerId],
      ['share', '=', false],
      ['active', '=', true],
    ],
    fields: ['id'],
    limit: 1,
  })

  return rows.length > 0
}
