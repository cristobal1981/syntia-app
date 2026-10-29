import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import { addDaysIso } from '@/src/modules/facturacion/domain/dates'
import { formatInvoiceNumber, INVOICE_SERIES } from '@/src/modules/facturacion/domain/numbering'
import { DEMO_ISSUER } from '@/src/modules/facturacion/domain/issuer'
import { DEFAULT_PAYMENT_TERM_DAYS } from '@/src/modules/facturacion/domain/payment-status'
import { completeCif } from '@/src/modules/facturacion/domain/tax-id'
import type { Invoice, InvoiceKind, TaxRegime } from '@/src/modules/facturacion/domain/types'

type Third = { name: string; taxId: string; address: string }

/** Clientes ficticios (los NIF llevan su dígito de control correcto, pero no son de nadie). */
export const SAMPLE_THIRD_PARTIES = {
  hotel: { name: 'Hotel Costa Teguise S.L.', taxId: completeCif('B3512345'), address: 'Avenida de las Playas, 10, 35508 Costa Teguise' },
  bodegas: { name: 'Bodegas El Grifo S.A.', taxId: completeCif('A3500001'), address: 'Carretera La Geria, km 3, 35570 Yaiza' },
  cabildo: { name: 'Cabildo de Lanzarote', taxId: completeCif('P3500001'), address: 'Avenida Fred Olsen, s/n, 35500 Arrecife' },
  restaurante: { name: 'Restaurante La Tabla C.B.', taxId: completeCif('E3522233'), address: 'Calle Real, 22, 35550 San Bartolomé' },
  agencia: { name: 'Agencia Atlántico Viajes S.L.', taxId: completeCif('B3565432'), address: 'Calle León y Castillo, 5, 35500 Arrecife' },
} satisfies Record<string, Third>

type SampleSpec = {
  id: string
  /** Se numeran por orden en su serie y año. */
  sequence?: number
  kind?: InvoiceKind
  issueDate: string
  third: Third
  concept: string
  categoryId: string
  baseEuros: number
  taxRate?: number
  withholdingRate?: number
  paymentDate?: string | null
  review?: Invoice['review']
  regime?: TaxRegime
  draft?: boolean
  rectifies?: string
  rectificationReason?: string
}

function sample(spec: SampleSpec): Invoice {
  const amounts = computeInvoiceAmounts(
    Math.round(spec.baseEuros * 100),
    spec.taxRate ?? 7,
    spec.withholdingRate ?? 0
  )
  const kind = spec.kind ?? 'ordinaria'
  const issued = !spec.draft
  const series = INVOICE_SERIES[kind]
  const year = Number(spec.issueDate.slice(0, 4))

  return {
    id: spec.id,
   
    invoiceNumber: issued && spec.sequence ? formatInvoiceNumber(series, year, spec.sequence) : '',
    status: spec.draft ? 'borrador' : 'definitiva',
    kind,
    series: issued ? series : '',
    sequence: issued ? (spec.sequence ?? null) : null,
    issueDate: spec.issueDate,
    dueDate: addDaysIso(spec.issueDate, kind === 'rectificativa' ? 0 : DEFAULT_PAYMENT_TERM_DAYS),
    counterpartyName: spec.third.name,
    counterpartyTaxId: spec.third.taxId,
    counterpartyAddress: spec.third.address,
    counterpartyTerritory: 'canarias',
    counterpartyKind: 'empresa',
    taxNote: '',
    concept: spec.concept,
    lines: [{ id: `${spec.id}-l1`, description: spec.concept, quantity: 1, unitPriceCents: amounts.baseCents }],
    categoryId: spec.categoryId,
    regime: spec.regime ?? 'igic',
    ...amounts,
    paymentDate: spec.paymentDate ?? null,
    review: spec.review ?? 'pendiente',
    rectifies: spec.rectifies ?? null,
    rectificationReason: spec.rectificationReason ?? '',
    dateReason: '',
    paymentMethod: 'transferencia',
    issuedAt: issued ? `${spec.issueDate}T10:00:00.000Z` : null,
    issuer: issued ? DEMO_ISSUER : null,
    source: 'ejemplo',
    createdAt: `${spec.issueDate}T09:00:00.000Z`,
  }
}

const T = SAMPLE_THIRD_PARTIES

/**
 * Facturas de ejemplo de un autónomo canario ficticio (diseño gráfico), repartidas por
 * 2026: facturas ya expedidas (inalterables), una rectificativa y un borrador.
 */
export const SAMPLE_INVOICES: readonly Invoice[] = [
  sample({ id: 'ejemplo-01', sequence: 1, issueDate: '2026-01-15', third: T.hotel, concept: 'Diseño de identidad visual', categoryId: 'servicios', baseEuros: 1800, paymentDate: '2026-02-10', review: 'revisada' }),
  sample({ id: 'ejemplo-02', sequence: 2, issueDate: '2026-02-20', third: T.bodegas, concept: 'Etiquetas y packaging', categoryId: 'servicios', baseEuros: 2400, withholdingRate: 15, paymentDate: '2026-03-18', review: 'revisada' }),
  sample({ id: 'ejemplo-r1', kind: 'rectificativa', sequence: 1, issueDate: '2026-03-05', third: T.bodegas, concept: 'Rectificación de la factura F-2026-0002', categoryId: 'servicios', baseEuros: -300, withholdingRate: 15, review: 'revisada', rectifies: 'ejemplo-02', rectificationReason: 'Descuento por volumen pactado y no aplicado en la factura original' }),
  sample({ id: 'ejemplo-06', sequence: 3, issueDate: '2026-04-12', third: T.cabildo, concept: 'Cartelería del festival', categoryId: 'servicios', baseEuros: 3200, paymentDate: '2026-05-20', review: 'revisada' }),
  sample({ id: 'ejemplo-09', sequence: 4, issueDate: '2026-06-25', third: T.restaurante, concept: 'Carta y señalética', categoryId: 'servicios', baseEuros: 950 }),
  sample({ id: 'ejemplo-11', sequence: 5, issueDate: '2026-09-09', third: T.agencia, concept: 'Campaña de verano', categoryId: 'servicios', baseEuros: 2750, withholdingRate: 15 }),
  sample({ id: 'ejemplo-14', sequence: 6, issueDate: '2026-10-08', third: T.hotel, concept: 'Mantenimiento de marca, 4T', categoryId: 'servicios', baseEuros: 600 }),
  sample({ id: 'ejemplo-15', draft: true, issueDate: '2026-10-15', third: T.hotel, concept: 'Diseño de la web corporativa', categoryId: 'servicios', baseEuros: 1500, withholdingRate: 15 }),
]
