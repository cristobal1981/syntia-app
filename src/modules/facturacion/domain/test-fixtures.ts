import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import { DEMO_ISSUER } from '@/src/modules/facturacion/domain/issuer'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

/** Factura base para los tests: una emitida definitiva sin retención, con valores neutros. */
export function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'inv-1',
    invoiceNumber: 'F-2026-0001',
    status: 'definitiva',
    kind: 'ordinaria',
    series: 'F',
    sequence: 1,
    issueDate: '2026-01-10',
    dueDate: '2026-02-09',
    counterpartyName: 'Cliente Demo S.L.',
    counterpartyTaxId: 'B35123454',
    counterpartyAddress: 'Calle Cliente, 2, 35500 Arrecife',
    concept: 'Servicios de diseño',
    categoryId: 'servicios',
    regime: 'igic',
    ...computeInvoiceAmounts(100000, 7, 0),
    paymentDate: null,
    review: 'pendiente',
    rectifies: null,
    rectificationReason: '',
    issuedAt: '2026-01-10T10:00:00.000Z',
    issuer: DEMO_ISSUER,
    source: 'manual',
    createdAt: '2026-01-10T09:00:00.000Z',
    ...overrides,
  }
}
