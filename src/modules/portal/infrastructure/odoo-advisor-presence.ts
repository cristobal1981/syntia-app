import {
  mapOdooImStatus,
  type AdvisorPresenceStatus,
} from '@/src/modules/profile/domain/advisor-presence'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

type OdooUserImStatusRow = {
  im_status?: string | false | null
}

export async function fetchAdvisorPresenceFromOdoo(
  partnerId: number
): Promise<AdvisorPresenceStatus | null> {
  const users = await odooSearchRead<OdooUserImStatusRow>('res.users', {
    domain: [
      ['partner_id', '=', partnerId],
      ['share', '=', false],
      ['active', '=', true],
    ],
    fields: ['im_status'],
    limit: 1,
  })

  const row = users[0]
  if (!row) return null

  return mapOdooImStatus(row.im_status)
}
