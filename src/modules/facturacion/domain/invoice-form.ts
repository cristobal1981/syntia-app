import { addDaysIso } from '@/src/modules/facturacion/domain/dates'
import { DEFAULT_PAYMENT_TERM_DAYS } from '@/src/modules/facturacion/domain/payment-status'
import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import { isValidTaxId, normalizeTaxId } from '@/src/modules/facturacion/domain/tax-id'
import { DEFAULT_CATEGORY_ID, getCategory } from '@/src/modules/facturacion/domain/categories'
import { parseAmountToCents } from '@/src/modules/facturacion/domain/money'
import type { ParsedInvoice } from '@/src/modules/facturacion/domain/parse-invoice-text'
import { isValidIsoDate } from '@/lib/validation'
import { DEFAULT_TAX_RATE, taxRatesFor } from '@/src/modules/facturacion/domain/tax-rates'
import type {
  Invoice,
  InvoiceDirection,
  InvoiceDraft,
  InvoiceReviewStatus,
  InvoiceSource,
  TaxRegime,
} from '@/src/modules/facturacion/domain/types'

/** Valores del formulario de factura: todo texto, tal como lo escribe la persona. */
export type InvoiceFormValues = {
  direction: InvoiceDirection
  invoiceNumber: string
  issueDate: string
  /** Vacío: se usa el plazo por defecto (30 días). */
  dueDate: string
  counterpartyName: string
  counterpartyTaxId: string
  counterpartyAddress: string
  concept: string
  categoryId: string
  regime: TaxRegime
  /** Base imponible en euros, p. ej. «1.234,56». */
  base: string
  taxRate: string
  withholdingRate: string
  deductiblePercent: string
  paymentDate: string
  review: InvoiceReviewStatus
}

export type InvoiceFormErrorKey =
  | 'invoiceNumberRequired'
  | 'issueDateInvalid'
  | 'dueDateInvalid'
  | 'dueBeforeIssue'
  | 'counterpartyRequired'
  | 'taxIdInvalid'
  | 'baseInvalid'
  | 'deductibleInvalid'
  | 'paymentDateInvalid'
  | 'paymentBeforeIssue'

export function emptyInvoiceForm(direction: InvoiceDirection = 'recibida'): InvoiceFormValues {
  return {
    direction,
    invoiceNumber: '',
    issueDate: '',
    dueDate: '',
    counterpartyName: '',
    counterpartyTaxId: '',
    counterpartyAddress: '',
    concept: '',
    categoryId: DEFAULT_CATEGORY_ID[direction],
    regime: 'igic',
    base: '',
    taxRate: String(DEFAULT_TAX_RATE.igic),
    withholdingRate: '0',
    deductiblePercent: '100',
    paymentDate: '',
    review: 'pendiente',
  }
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function formFromInvoice(invoice: Invoice): InvoiceFormValues {
  return {
    direction: invoice.direction,
    invoiceNumber: invoice.invoiceNumber,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    counterpartyName: invoice.counterpartyName,
    counterpartyTaxId: invoice.counterpartyTaxId,
    counterpartyAddress: invoice.counterpartyAddress,
    concept: invoice.concept,
    categoryId: invoice.categoryId,
    regime: invoice.regime,
    base: centsToInput(invoice.baseCents),
    taxRate: String(invoice.taxRate),
    withholdingRate: String(invoice.withholdingRate),
    deductiblePercent: String(invoice.deductiblePercent),
    paymentDate: invoice.paymentDate ?? '',
    review: invoice.review,
  }
}

/** Vuelca en el formulario lo leído del PDF, sin pisar con vacíos lo que ya hubiera. */
export function applyParsedInvoice(values: InvoiceFormValues, parsed: ParsedInvoice): InvoiceFormValues {
  const regime = parsed.regime ?? values.regime
  const next: InvoiceFormValues = { ...values, regime }

  if (parsed.invoiceNumber) next.invoiceNumber = parsed.invoiceNumber
  if (parsed.issueDate) next.issueDate = parsed.issueDate
  if (parsed.dueDate) next.dueDate = parsed.dueDate
  if (parsed.counterpartyName) next.counterpartyName = parsed.counterpartyName
  if (parsed.counterpartyTaxId) next.counterpartyTaxId = parsed.counterpartyTaxId
  if (parsed.baseCents !== null) next.base = centsToInput(parsed.baseCents)

  const allowedRates = taxRatesFor(regime)
  if (parsed.taxRate !== null && allowedRates.includes(parsed.taxRate)) {
    next.taxRate = String(parsed.taxRate)
  } else if (parsed.regime && parsed.regime !== values.regime) {
    next.taxRate = String(DEFAULT_TAX_RATE[regime])
  }

  if (parsed.withholdingRate !== null) next.withholdingRate = String(parsed.withholdingRate)
  return next
}

export function validateInvoiceForm(values: InvoiceFormValues): Partial<Record<keyof InvoiceFormValues, InvoiceFormErrorKey>> {
  const errors: Partial<Record<keyof InvoiceFormValues, InvoiceFormErrorKey>> = {}

  // En las emitidas el número lo asigna la aplicación al expedir la factura.
  if (values.direction === 'recibida' && !values.invoiceNumber.trim()) errors.invoiceNumber = 'invoiceNumberRequired'
  if (!isValidIsoDate(values.issueDate)) errors.issueDate = 'issueDateInvalid'
  if (values.dueDate) {
    if (!isValidIsoDate(values.dueDate)) errors.dueDate = 'dueDateInvalid'
    else if (!errors.issueDate && values.dueDate < values.issueDate) errors.dueDate = 'dueBeforeIssue'
  }
  if (!values.counterpartyName.trim()) errors.counterpartyName = 'counterpartyRequired'
  // En un borrador de emitida el NIF puede esperar a la expedición, pero si se escribe debe ser válido.
  const taxIdOptional = values.direction === 'emitida' && !values.counterpartyTaxId.trim()
  if (!taxIdOptional && !isValidTaxId(values.counterpartyTaxId)) errors.counterpartyTaxId = 'taxIdInvalid'

  const base = parseAmountToCents(values.base)
  if (base === null || base <= 0) errors.base = 'baseInvalid'

  if (values.direction === 'recibida') {
    const percent = Number(values.deductiblePercent)
    if (!Number.isInteger(percent) || percent < 0 || percent > 100) {
      errors.deductiblePercent = 'deductibleInvalid'
    }
  }

  if (values.paymentDate) {
    if (!isValidIsoDate(values.paymentDate)) {
      errors.paymentDate = 'paymentDateInvalid'
    } else if (!errors.issueDate && values.paymentDate < values.issueDate) {
      errors.paymentDate = 'paymentBeforeIssue'
    }
  }

  return errors
}

/** Construye el borrador a guardar; el formulario debe haber pasado `validateInvoiceForm`. */
export function draftFromForm(
  values: InvoiceFormValues,
  meta: { pdfName: string | null; attachmentMime: string | null; source: InvoiceSource }
): InvoiceDraft {
  const baseCents = parseAmountToCents(values.base) ?? 0
  const category = getCategory(values.categoryId, values.direction)

  return {
    direction: values.direction,
    invoiceNumber: values.direction === 'recibida' ? values.invoiceNumber.trim() : '',
    status: values.direction === 'recibida' ? 'definitiva' : 'borrador',
    kind: 'ordinaria',
    series: '',
    sequence: null,
    issueDate: values.issueDate,
    dueDate: values.dueDate || addDaysIso(values.issueDate, DEFAULT_PAYMENT_TERM_DAYS),
    counterpartyName: values.counterpartyName.trim(),
    counterpartyTaxId: normalizeTaxId(values.counterpartyTaxId),
    counterpartyAddress: values.counterpartyAddress.trim(),
    concept: values.concept.trim(),
    categoryId: category.id,
    regime: values.regime,
    ...computeInvoiceAmounts(baseCents, Number(values.taxRate), Number(values.withholdingRate)),
    deductiblePercent: values.direction === 'recibida' ? Number(values.deductiblePercent) : 100,
    paymentDate: values.paymentDate || null,
    review: values.review,
    rectifies: null,
    rectificationReason: '',
    issuedAt: null,
    issuer: null,
    pdfName: meta.pdfName,
    attachmentMime: meta.attachmentMime,
    source: meta.source,
  }
}
