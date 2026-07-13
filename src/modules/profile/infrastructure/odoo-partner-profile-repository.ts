import { getOdooContactEmailFieldName } from '@/src/modules/directory/infrastructure/odoo-partner-env'
import {
  mapOdooPartnerToClientProfile,
  type OdooPartnerBankRow,
  type OdooPartnerProfileRow,
} from '@/src/modules/profile/domain/map-odoo-partner-profile'
import type { ClientProfile } from '@/src/modules/profile/domain/types'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

export async function fetchClientProfileFromOdoo(
  partnerId: number,
  clientId: string
): Promise<ClientProfile> {
  const contactEmailField = getOdooContactEmailFieldName()

  const partnerRows = await odooSearchRead<OdooPartnerProfileRow>('res.partner', {
    domain: [['id', '=', partnerId]],
    fields: [
      'name',
      'email',
      'phone',
      'vat',
      'street',
      'street2',
      'zip',
      'city',
      'state_id',
      'country_id',
      contactEmailField,
    ],
    limit: 1,
  })

  const partner = partnerRows[0]
  if (!partner) {
    throw new Error('ODOO_PARTNER_NOT_FOUND')
  }

  const bankRows = await odooSearchRead<OdooPartnerBankRow>('res.partner.bank', {
    domain: [['partner_id', '=', partnerId]],
    fields: ['acc_number', 'sequence'],
    order: 'sequence asc, id asc',
    limit: 10,
  })

  return mapOdooPartnerToClientProfile({
    clientId,
    partner,
    contactEmailField,
    bankRows,
  })
}
