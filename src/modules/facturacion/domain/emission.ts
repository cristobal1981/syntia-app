import { localIsoDate } from '@/src/modules/facturacion/domain/dates'
import { isIssuerComplete, type Issuer } from '@/src/modules/facturacion/domain/issuer'
import { formatInvoiceNumber, INVOICE_SERIES, lastIssueDate, nextSequence } from '@/src/modules/facturacion/domain/numbering'
import { issuerTaxProfile, resolveTax } from '@/src/modules/facturacion/domain/tax-rules'
import { isValidTaxId } from '@/src/modules/facturacion/domain/tax-id'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

type EmissionIssueCode =
  | 'not_issuable'
  | 'issuer_incomplete'
  | 'counterparty_name'
  | 'counterparty_tax_id'
  | 'counterparty_address'
  | 'concept'
  | 'amount'
  | 'tax_mismatch'
  | 'date_in_future'
  | 'date_reason_missing'
  | 'date_before_previous'
  | 'rectified_missing'
  | 'rectification_reason'

export type EmissionIssue = { code: EmissionIssueCode; field: string }

/**
 * Comprueba el contenido mínimo de una factura para poder expedirla (art. 6 del
 * Reglamento de facturación) y su orden cronológico dentro de la serie.
 */
export function validateEmission(
  invoice: Invoice,
  issuer: Issuer,
  all: Invoice[],
  today: string
): EmissionIssue[] {
  if (invoice.status !== 'borrador') {
    return [{ code: 'not_issuable', field: 'status' }]
  }

  const issues: EmissionIssue[] = []
  if (!isIssuerComplete(issuer)) issues.push({ code: 'issuer_incomplete', field: 'issuer' })
  if (!invoice.counterpartyName.trim()) issues.push({ code: 'counterparty_name', field: 'counterpartyName' })
  if (!isValidTaxId(invoice.counterpartyTaxId)) issues.push({ code: 'counterparty_tax_id', field: 'counterpartyTaxId' })
  if (!invoice.counterpartyAddress.trim()) issues.push({ code: 'counterparty_address', field: 'counterpartyAddress' })
  if (!invoice.concept.trim()) issues.push({ code: 'concept', field: 'concept' })

  const validAmount = invoice.kind === 'rectificativa' ? invoice.baseCents !== 0 : invoice.baseCents > 0
  if (!validAmount) issues.push({ code: 'amount', field: 'base' })

  if (invoice.kind === 'ordinaria') {
    const expected = resolveTax(issuerTaxProfile(issuer), { territory: invoice.counterpartyTerritory, kind: invoice.counterpartyKind })
    const matches =
      invoice.regime === expected.regime &&
      invoice.taxRate === expected.taxRate &&
      invoice.withholdingRate === expected.withholdingRate &&
      invoice.taxNote === expected.note
    if (!matches) issues.push({ code: 'tax_mismatch', field: 'taxRate' })
  }

  if (invoice.issueDate > today) issues.push({ code: 'date_in_future', field: 'issueDate' })
  if (invoice.kind === 'ordinaria' && invoice.issueDate < today && !invoice.dateReason.trim()) {
    issues.push({ code: 'date_reason_missing', field: 'dateReason' })
  }
  const series = INVOICE_SERIES[invoice.kind]
  const previous = lastIssueDate(all, series)
  if (previous && invoice.issueDate < previous) issues.push({ code: 'date_before_previous', field: 'issueDate' })

  if (invoice.kind === 'rectificativa') {
    const original = invoice.rectifies ? all.find((candidate) => candidate.id === invoice.rectifies) : undefined
    if (!original || original.status !== 'definitiva') issues.push({ code: 'rectified_missing', field: 'rectifies' })
    if (!invoice.rectificationReason.trim()) issues.push({ code: 'rectification_reason', field: 'rectificationReason' })
  }

  return issues
}

export type EmissionResult = { ok: true; invoice: Invoice } | { ok: false; issues: EmissionIssue[] }

/** Expide la factura: le asigna el siguiente número de su serie, la fija y registra el momento. */
export function emitInvoice(invoice: Invoice, issuer: Issuer, all: Invoice[], now: Date): EmissionResult {
  const issues = validateEmission(invoice, issuer, all, localIsoDate(now))
  if (issues.length > 0) return { ok: false, issues }

  const series = INVOICE_SERIES[invoice.kind]
  const year = Number(invoice.issueDate.slice(0, 4))
  const sequence = nextSequence(all, series, year)

  return {
    ok: true,
    invoice: {
      ...invoice,
      status: 'definitiva',
      series,
      sequence,
      invoiceNumber: formatInvoiceNumber(series, year, sequence),
      issuedAt: now.toISOString(),
      issuer: { ...issuer },
    },
  }
}
