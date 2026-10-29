import { addDaysIso, localIsoDate } from '@/src/modules/facturacion/domain/dates'
import { DEFAULT_PAYMENT_TERM_DAYS } from '@/src/modules/facturacion/domain/payment-status'
import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import { isValidTaxId, normalizeTaxId } from '@/src/modules/facturacion/domain/tax-id'
import { DEFAULT_CATEGORY_ID, getCategory } from '@/src/modules/facturacion/domain/categories'
import { parseAmountToCents } from '@/src/modules/facturacion/domain/money'
import { isValidIsoDate } from '@/lib/validation'
import { DEFAULT_TAX_RATE } from '@/src/modules/facturacion/domain/tax-rates'
import {
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  type Invoice,
  InvoiceDraft,
  InvoiceReviewStatus,
  InvoiceSource,
  PaymentMethod,
  TaxRegime,
} from '@/src/modules/facturacion/domain/types'

/** Valores del formulario de factura: todo texto, tal como lo escribe la persona. */
export type InvoiceFormValues = {
  issueDate: string
  /** Obligatorio si la fecha es anterior a hoy. */
  dateReason: string
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
  paymentMethod: PaymentMethod
  paymentDate: string
  review: InvoiceReviewStatus
}

/** Límites razonables: evitan importes que desbordan la pantalla y textos que rompen la factura. */
const MAX_BASE_CENTS = 999_999_999
const MAX_NAME_LENGTH = 120
const MAX_ADDRESS_LENGTH = 200
const MAX_CONCEPT_LENGTH = 300

export type InvoiceFormErrorKey =
  | 'issueDateInvalid'
  | 'dateReasonRequired'
  | 'dueDateInvalid'
  | 'dueBeforeIssue'
  | 'counterpartyRequired'
  | 'taxIdInvalid'
  | 'baseInvalid'
  | 'baseTooLarge'
  | 'tooLong'
  | 'paymentDateInvalid'
  | 'paymentBeforeIssue'

export function emptyInvoiceForm(): InvoiceFormValues {
  return {
    issueDate: localIsoDate(),
    dateReason: '',
    dueDate: '',
    counterpartyName: '',
    counterpartyTaxId: '',
    counterpartyAddress: '',
    concept: '',
    categoryId: DEFAULT_CATEGORY_ID,
    regime: 'igic',
    base: '',
    taxRate: String(DEFAULT_TAX_RATE.igic),
    withholdingRate: '0',
    paymentMethod: DEFAULT_PAYMENT_METHOD,
    paymentDate: '',
    review: 'pendiente',
  }
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',')
}

export function formFromInvoice(invoice: Invoice): InvoiceFormValues {
  return {
    issueDate: invoice.issueDate,
    dateReason: invoice.dateReason,
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
    paymentMethod: invoice.paymentMethod,
    paymentDate: invoice.paymentDate ?? '',
    review: invoice.review,
  }
}

export function validateInvoiceForm(
  values: InvoiceFormValues,
  today: string = localIsoDate()
): Partial<Record<keyof InvoiceFormValues, InvoiceFormErrorKey>> {
  const errors: Partial<Record<keyof InvoiceFormValues, InvoiceFormErrorKey>> = {}

  // El número lo asigna la aplicación al expedir la factura.
  if (!isValidIsoDate(values.issueDate)) errors.issueDate = 'issueDateInvalid'
  else if (values.issueDate < today && !values.dateReason.trim()) errors.dateReason = 'dateReasonRequired'
  if (values.dateReason.trim().length > MAX_CONCEPT_LENGTH) errors.dateReason = 'tooLong'
  if (values.dueDate) {
    if (!isValidIsoDate(values.dueDate)) errors.dueDate = 'dueDateInvalid'
    else if (!errors.issueDate && values.dueDate < values.issueDate) errors.dueDate = 'dueBeforeIssue'
  }
  if (!values.counterpartyName.trim()) errors.counterpartyName = 'counterpartyRequired'
  else if (values.counterpartyName.trim().length > MAX_NAME_LENGTH) errors.counterpartyName = 'tooLong'
  if (values.counterpartyAddress.trim().length > MAX_ADDRESS_LENGTH) errors.counterpartyAddress = 'tooLong'
  if (values.concept.trim().length > MAX_CONCEPT_LENGTH) errors.concept = 'tooLong'
  // En un borrador el NIF puede esperar a la expedición, pero si se escribe debe ser válido.
  if (values.counterpartyTaxId.trim() && !isValidTaxId(values.counterpartyTaxId)) errors.counterpartyTaxId = 'taxIdInvalid'

  const base = parseAmountToCents(values.base)
  if (base === null || base <= 0) errors.base = 'baseInvalid'
  else if (base > MAX_BASE_CENTS) errors.base = 'baseTooLarge'

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
export function draftFromForm(values: InvoiceFormValues, source: InvoiceSource = 'manual'): InvoiceDraft {
  const baseCents = parseAmountToCents(values.base) ?? 0
  const category = getCategory(values.categoryId)

  return {
    invoiceNumber: '',
    status: 'borrador',
    kind: 'ordinaria',
    series: '',
    sequence: null,
    issueDate: values.issueDate,
    dateReason: values.issueDate < localIsoDate() ? values.dateReason.trim() : '',
    dueDate: values.dueDate || addDaysIso(values.issueDate, DEFAULT_PAYMENT_TERM_DAYS),
    counterpartyName: values.counterpartyName.trim(),
    counterpartyTaxId: normalizeTaxId(values.counterpartyTaxId),
    counterpartyAddress: values.counterpartyAddress.trim(),
    concept: values.concept.trim(),
    categoryId: category.id,
    regime: values.regime,
    ...computeInvoiceAmounts(baseCents, Number(values.taxRate), Number(values.withholdingRate)),
    paymentMethod: PAYMENT_METHODS.includes(values.paymentMethod) ? values.paymentMethod : DEFAULT_PAYMENT_METHOD,
    paymentDate: values.paymentDate || null,
    review: values.review,
    rectifies: null,
    rectificationReason: '',
    issuedAt: null,
    issuer: null,
    source,
  }
}
