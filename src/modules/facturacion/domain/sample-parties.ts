import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'
import { emptyParty, partiesFromInvoices, type Party } from '@/src/modules/facturacion/domain/party-directory'
import { completeCif } from '@/src/modules/facturacion/domain/tax-id'

/** Terceros de la demo: los de las facturas de ejemplo y uno sin facturas (se puede borrar). */
export const SAMPLE_PARTIES: readonly Party[] = [
  ...partiesFromInvoices([...SAMPLE_INVOICES]).map((party) => ({
    ...party,
    email: 'administracion@tercero.example',
  })),
  {
    ...emptyParty(),
    id: 'tercero-extra',
    name: 'Clínica Dental Sonrisa S.L.',
    taxId: completeCif('B3566677'),
    address: 'Calle Real, 31',
    postalCode: '35500',
    city: 'Arrecife',
    province: 'Las Palmas',
    email: 'info@sonrisa.example',
    notes: 'Posible cliente: pidió presupuesto de rotulación.',
  },
]
