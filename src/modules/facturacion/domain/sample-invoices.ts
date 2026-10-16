import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import { addDaysIso } from '@/src/modules/facturacion/domain/dates'
import { formatInvoiceNumber, INVOICE_SERIES } from '@/src/modules/facturacion/domain/numbering'
import { DEMO_ISSUER } from '@/src/modules/facturacion/domain/issuer'
import { DEFAULT_PAYMENT_TERM_DAYS } from '@/src/modules/facturacion/domain/payment-status'
import { completeCif } from '@/src/modules/facturacion/domain/tax-id'
import type { Invoice, InvoiceDirection, InvoiceKind, TaxRegime } from '@/src/modules/facturacion/domain/types'

type Third = { name: string; taxId: string; address: string }

/** Terceros ficticios (los NIF llevan su dígito de control correcto, pero no son de nadie). */
export const SAMPLE_THIRD_PARTIES = {
  hotel: { name: 'Hotel Costa Teguise S.L.', taxId: completeCif('B3512345'), address: 'Avenida de las Playas, 10, 35508 Costa Teguise' },
  bodegas: { name: 'Bodegas El Grifo S.A.', taxId: completeCif('A3500001'), address: 'Carretera La Geria, km 3, 35570 Yaiza' },
  cabildo: { name: 'Cabildo de Lanzarote', taxId: completeCif('P3500001'), address: 'Avenida Fred Olsen, s/n, 35500 Arrecife' },
  restaurante: { name: 'Restaurante La Tabla C.B.', taxId: completeCif('E3522233'), address: 'Calle Real, 22, 35550 San Bartolomé' },
  agencia: { name: 'Agencia Atlántico Viajes S.L.', taxId: completeCif('B3565432'), address: 'Calle León y Castillo, 5, 35500 Arrecife' },
  endesa: { name: 'Endesa Energía S.A.U.', taxId: completeCif('A8194807'), address: 'Calle Ribera del Loira, 60, 28042 Madrid' },
  adobe: { name: 'Adobe Systems Software Ireland', taxId: 'IE9999999X', address: '4-6 Riverwalk, Citywest Business Campus, Dublín (Irlanda)' },
  inmobiliaria: { name: 'Inmobiliaria Lanzarote Centro S.L.', taxId: completeCif('B3577788'), address: 'Calle Triana, 8, 35500 Arrecife' },
  gestoria: { name: 'Gestoría Lanzarote Digital S.L.', taxId: completeCif('B3599900'), address: 'Calle Blas Cabrera, 14, 35500 Arrecife' },
  papeleria: { name: 'Papelería Insular S.L.', taxId: completeCif('B3545678'), address: 'Calle Triana, 12, 35500 Arrecife' },
  mapfre: { name: 'Mapfre Seguros S.A.', taxId: completeCif('A2814193'), address: 'Avenida General Perón, 40, 28020 Madrid' },
  meta: { name: 'Meta Platforms Ireland Ltd', taxId: 'IE9999998V', address: 'Merrion Road, Dublín 4 (Irlanda)' },
  vodafone: { name: 'Vodafone España S.A.U.', taxId: completeCif('A8090739'), address: 'Avenida de América, 115, 28042 Madrid' },
} satisfies Record<string, Third>

type SampleSpec = {
  id: string
  direction: InvoiceDirection
  /** Solo las emitidas: se numeran por orden en su serie y año. */
  sequence?: number
  kind?: InvoiceKind
  issueDate: string
  third: Third
  concept: string
  categoryId: string
  baseEuros: number
  taxRate?: number
  withholdingRate?: number
  deductiblePercent?: number
  paymentDate?: string | null
  review?: Invoice['review']
  regime?: TaxRegime
  receivedNumber?: string
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
  const issued = spec.direction === 'emitida' && !spec.draft
  const series = spec.direction === 'emitida' ? INVOICE_SERIES[kind] : ''
  const year = Number(spec.issueDate.slice(0, 4))

  return {
    id: spec.id,
    direction: spec.direction,
    invoiceNumber:
      spec.direction === 'recibida'
        ? (spec.receivedNumber ?? '')
        : issued && spec.sequence
          ? formatInvoiceNumber(series, year, spec.sequence)
          : '',
    status: spec.draft ? 'borrador' : 'definitiva',
    kind,
    series: issued ? series : '',
    sequence: issued ? (spec.sequence ?? null) : null,
    issueDate: spec.issueDate,
    dueDate: addDaysIso(spec.issueDate, kind === 'rectificativa' ? 0 : DEFAULT_PAYMENT_TERM_DAYS),
    counterpartyName: spec.third.name,
    counterpartyTaxId: spec.third.taxId,
    counterpartyAddress: spec.third.address,
    concept: spec.concept,
    categoryId: spec.categoryId,
    regime: spec.regime ?? 'igic',
    ...amounts,
    deductiblePercent: spec.deductiblePercent ?? 100,
    paymentDate: spec.paymentDate ?? null,
    review: spec.review ?? 'pendiente',
    rectifies: spec.rectifies ?? null,
    rectificationReason: spec.rectificationReason ?? '',
    issuedAt: issued ? `${spec.issueDate}T10:00:00.000Z` : null,
    issuer: issued ? DEMO_ISSUER : null,
    pdfName: null,
    attachmentMime: null,
    source: 'ejemplo',
    createdAt: `${spec.issueDate}T09:00:00.000Z`,
  }
}

const T = SAMPLE_THIRD_PARTIES

/**
 * Facturas de ejemplo de un autónomo canario ficticio (diseño gráfico), repartidas por
 * 2026: emitidas ya expedidas (inalterables), una rectificativa, un borrador y gastos.
 */
export const SAMPLE_INVOICES: readonly Invoice[] = [
  sample({ id: 'ejemplo-01', direction: 'emitida', sequence: 1, issueDate: '2026-01-15', third: T.hotel, concept: 'Diseño de identidad visual', categoryId: 'servicios', baseEuros: 1800, paymentDate: '2026-02-10', review: 'revisada' }),
  sample({ id: 'ejemplo-02', direction: 'emitida', sequence: 2, issueDate: '2026-02-20', third: T.bodegas, concept: 'Etiquetas y packaging', categoryId: 'servicios', baseEuros: 2400, withholdingRate: 15, paymentDate: '2026-03-18', review: 'revisada' }),
  sample({ id: 'ejemplo-r1', direction: 'emitida', kind: 'rectificativa', sequence: 1, issueDate: '2026-03-05', third: T.bodegas, concept: 'Rectificación de la factura F-2026-0002', categoryId: 'servicios', baseEuros: -300, withholdingRate: 15, review: 'revisada', rectifies: 'ejemplo-02', rectificationReason: 'Descuento por volumen pactado y no aplicado en la factura original' }),
  sample({ id: 'ejemplo-03', direction: 'recibida', issueDate: '2026-01-31', third: T.endesa, receivedNumber: 'F-88213', concept: 'Electricidad del estudio, enero', categoryId: 'suministros', baseEuros: 92.4, paymentDate: '2026-02-05', review: 'revisada' }),
  sample({ id: 'ejemplo-04', direction: 'recibida', issueDate: '2026-02-03', third: T.adobe, receivedNumber: 'ADB-2026-0112', concept: 'Suscripción Creative Cloud', categoryId: 'otros-servicios', baseEuros: 60.49, taxRate: 0, paymentDate: '2026-02-03', review: 'revisada' }),
  sample({ id: 'ejemplo-05', direction: 'recibida', issueDate: '2026-03-02', third: T.inmobiliaria, receivedNumber: '12/2026', concept: 'Alquiler del local, marzo', categoryId: 'alquiler', baseEuros: 650, withholdingRate: 19, paymentDate: '2026-03-05', review: 'revisada' }),
  sample({ id: 'ejemplo-06', direction: 'emitida', sequence: 3, issueDate: '2026-04-12', third: T.cabildo, concept: 'Cartelería del festival', categoryId: 'servicios', baseEuros: 3200, paymentDate: '2026-05-20', review: 'revisada' }),
  sample({ id: 'ejemplo-07', direction: 'recibida', issueDate: '2026-04-18', third: T.gestoria, receivedNumber: 'R-4471', concept: 'Honorarios de gestoría, 1T', categoryId: 'profesionales', baseEuros: 180, withholdingRate: 15, paymentDate: '2026-04-30', review: 'revisada' }),
  sample({ id: 'ejemplo-08', direction: 'recibida', issueDate: '2026-05-07', third: T.papeleria, receivedNumber: 'A-9921', concept: 'Papel y material de oficina', categoryId: 'material', baseEuros: 210.5 }),
  sample({ id: 'ejemplo-09', direction: 'emitida', sequence: 4, issueDate: '2026-06-25', third: T.restaurante, concept: 'Carta y señalética', categoryId: 'servicios', baseEuros: 950 }),
  sample({ id: 'ejemplo-10', direction: 'recibida', issueDate: '2026-07-14', third: T.mapfre, receivedNumber: 'M-2026-77', concept: 'Seguro de responsabilidad civil', categoryId: 'seguros', baseEuros: 310, taxRate: 0, paymentDate: '2026-07-14' }),
  sample({ id: 'ejemplo-11', direction: 'emitida', sequence: 5, issueDate: '2026-09-09', third: T.agencia, concept: 'Campaña de verano', categoryId: 'servicios', baseEuros: 2750, withholdingRate: 15 }),
  sample({ id: 'ejemplo-12', direction: 'recibida', issueDate: '2026-09-21', third: T.meta, receivedNumber: 'T-30211', concept: 'Publicidad en redes sociales', categoryId: 'publicidad', baseEuros: 400, taxRate: 0, paymentDate: '2026-09-21' }),
  sample({ id: 'ejemplo-13', direction: 'recibida', issueDate: '2026-10-05', third: T.vodafone, receivedNumber: 'V-1180', concept: 'Fibra y móvil, septiembre', categoryId: 'suministros', baseEuros: 54.9, deductiblePercent: 50 }),
  sample({ id: 'ejemplo-14', direction: 'emitida', sequence: 6, issueDate: '2026-10-08', third: T.hotel, concept: 'Mantenimiento de marca, 4T', categoryId: 'servicios', baseEuros: 600 }),
  sample({ id: 'ejemplo-15', direction: 'emitida', draft: true, issueDate: '2026-10-15', third: T.hotel, concept: 'Diseño de la web corporativa', categoryId: 'servicios', baseEuros: 1500 }),
]
