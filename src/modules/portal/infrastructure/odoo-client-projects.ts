import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

type OdooProjectRow = {
  id: number
}

export async function fetchClientProjectIds(partnerId: number): Promise<number[]> {
  const rows = await odooSearchRead<OdooProjectRow>('project.project', {
    domain: [['partner_id', '=', partnerId]],
    fields: ['id'],
    order: 'write_date desc',
    limit: 20,
  })

  return rows.map((row) => row.id)
}
