import { addDaysIso, localIsoDate } from '@/src/modules/facturacion/domain/dates'
import { DEFAULT_PAYMENT_TERM_DAYS } from '@/src/modules/facturacion/domain/payment-status'
import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import { isValidTaxId, normalizeTaxId } from '@/src/modules/facturacion/domain/tax-id'
import { DEFAULT_CATEGORY_ID, getCategory } from '@/src/modules/facturacion/domain/categories'
import { parseAmountToCents } from '@/src/modules/facturacion/domain/money'
import {
  linesFromLegacy,
  MAX_INVOICE_LINES,
  MAX_LINE_DESCRIPTION_LENGTH,
  parseQuantity,
  formatQuantity,
  summarizeLines,
  sumLinesCents,
} from '@/src/modules/facturacion/domain/invoice-lines'
import { isValidIsoDate } from '@/lib/validation'
import { DEFAULT_TAX_RATE } from '@/src/modules/facturacion/domain/tax-rates'
import {
  DEFAULT_PAYMENT_METHOD,
  PAYMENT_METHODS,
  type Invoice,
  InvoiceDraft,
  InvoiceReviewStatus,
  InvoiceLine,
  InvoiceSource,
  PaymentMethod,
  TaxRegime,
} from '@/src/modules/facturacion/domain/types'

/** Una línea del formulario: todo texto, tal como lo escribe la persona. */
export type InvoiceFormLine = {
  id: string
  /** Producto del catálogo del que partió la línea (solo informativo; la línea guarda sus propios datos). */
  productId: string
  description: string
  /** Cantidad, p. ej. «2» o «1,5». */
  quantity: string
  /** Precio unitario en euros, p. ej. «1.234,56». */
  unitPrice: string
}

export type InvoiceLineErrorKey = 'descriptionRequired' | 'descriptionTooLong' | 'quantityInvalid' | 'priceInvalid' | 'priceTooLarge'

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
  lines: InvoiceFormLine[]
  categoryId: string
  regime: TaxRegime
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
const MAX_REASON_LENGTH = 300
const MAX_UNIT_PRICE_CENTS = 999_999_999

export type InvoiceFormErrorKey =
  | 'issueDateInvalid'
  | 'dateReasonRequired'
  | 'dueDateInvalid'
  | 'dueBeforeIssue'
  | 'counterpartyRequired'
  | 'taxIdInvalid'
  | 'linesRequired'
  | 'tooManyLines'
  | 'linesInvalid'
  | 'baseTooLarge'
  | 'tooLong'
  | 'paymentDateInvalid'
  | 'paymentBeforeIssue'

let lineCounter = 0

/** Identificador de línea nuevo; basta con que no se repita dentro de la factura. */
export function newFormLineId(): string {
  lineCounter += 1
  return `linea-${Date.now().toString(36)}-${lineCounter}`
}

export function emptyFormLine(): InvoiceFormLine {
  return { id: newFormLineId(), productId: '', description: '', quantity: '1', unitPrice: '' }
}

export function emptyInvoiceForm(): InvoiceFormValues {
  return {
    issueDate: localIsoDate(),
    dateReason: '',
    dueDate: '',
    counterpartyName: '',
    counterpartyTaxId: '',
    counterpartyAddress: '',
    lines: [emptyFormLine()],
    categoryId: DEFAULT_CATEGORY_ID,
    regime: 'igic',
    taxRate: String(DEFAULT_TAX_RATE.igic),
    withholdingRate: '0',
    paymentMethod: DEFAULT_PAYMENT_METHOD,
    paymentDate: '',
    review: 'pendiente',
  }
}

export function centsToInput(cents: number): string {
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
    lines: (invoice.lines.length > 0 ? invoice.lines : linesFromLegacy(invoice)).map((line) => ({
      id: line.id,
      productId: '',
      description: line.description,
      quantity: formatQuantity(line.quantity),
      unitPrice: centsToInput(line.unitPriceCents),
    })),
    categoryId: invoice.categoryId,
    regime: invoice.regime,
    taxRate: String(invoice.taxRate),
    withholdingRate: String(invoice.withholdingRate),
    paymentMethod: invoice.paymentMethod,
    paymentDate: invoice.paymentDate ?? '',
    review: invoice.review,
  }
}

/** Errores por campo de cada línea, por id de línea; vacío si todas son correctas. */
export function validateFormLines(
  lines: readonly InvoiceFormLine[]
): Record<string, Partial<Record<'description' | 'quantity' | 'unitPrice', InvoiceLineErrorKey>>> {
  const errors: Record<string, Partial<Record<'description' | 'quantity' | 'unitPrice', InvoiceLineErrorKey>>> = {}
  for (const line of lines) {
    const found: Partial<Record<'description' | 'quantity' | 'unitPrice', InvoiceLineErrorKey>> = {}
    if (!line.description.trim()) found.description = 'descriptionRequired'
    else if (line.description.trim().length > MAX_LINE_DESCRIPTION_LENGTH) found.description = 'descriptionTooLong'
    if (parseQuantity(line.quantity) === null) found.quantity = 'quantityInvalid'
    const price = parseAmountToCents(line.unitPrice)
    if (price === null || price <= 0) found.unitPrice = 'priceInvalid'
    else if (price > MAX_UNIT_PRICE_CENTS) found.unitPrice = 'priceTooLarge'
    if (Object.keys(found).length > 0) errors[line.id] = found
  }
  return errors
}

/** Las líneas del formulario ya validadas, con números; las que no se pueden leer cuentan como cero. */
function parsedLines(lines: readonly InvoiceFormLine[]): InvoiceLine[] {
  return lines.map((line) => ({
    id: line.id,
    description: line.description.trim(),
    quantity: parseQuantity(line.quantity) ?? 0,
    unitPriceCents: parseAmountToCents(line.unitPrice) ?? 0,
  }))
}

/** Base imponible de lo escrito en el formulario (para ver los totales al momento). */
export function formLinesBaseCents(lines: readonly InvoiceFormLine[]): number {
  return Math.max(sumLinesCents(parsedLines(lines)), 0)
}

export function validateInvoiceForm(
  values: InvoiceFormValues,
  today: string = localIsoDate()
): Partial<Record<keyof InvoiceFormValues, InvoiceFormErrorKey>> {
  const errors: Partial<Record<keyof InvoiceFormValues, InvoiceFormErrorKey>> = {}

  // El número lo asigna la aplicación al expedir la factura.
  if (!isValidIsoDate(values.issueDate)) errors.issueDate = 'issueDateInvalid'
  else if (values.issueDate < today && !values.dateReason.trim()) errors.dateReason = 'dateReasonRequired'
  if (values.dateReason.trim().length > MAX_REASON_LENGTH) errors.dateReason = 'tooLong'
  if (values.dueDate) {
    if (!isValidIsoDate(values.dueDate)) errors.dueDate = 'dueDateInvalid'
    else if (!errors.issueDate && values.dueDate < values.issueDate) errors.dueDate = 'dueBeforeIssue'
  }
  if (!values.counterpartyName.trim()) errors.counterpartyName = 'counterpartyRequired'
  else if (values.counterpartyName.trim().length > MAX_NAME_LENGTH) errors.counterpartyName = 'tooLong'
  if (values.counterpartyAddress.trim().length > MAX_ADDRESS_LENGTH) errors.counterpartyAddress = 'tooLong'
  // En un borrador el NIF puede esperar a la expedición, pero si se escribe debe ser válido.
  if (values.counterpartyTaxId.trim() && !isValidTaxId(values.counterpartyTaxId)) errors.counterpartyTaxId = 'taxIdInvalid'

  if (values.lines.length === 0) errors.lines = 'linesRequired'
  else if (values.lines.length > MAX_INVOICE_LINES) errors.lines = 'tooManyLines'
  else if (Object.keys(validateFormLines(values.lines)).length > 0) errors.lines = 'linesInvalid'
  else if (sumLinesCents(parsedLines(values.lines)) > MAX_BASE_CENTS) errors.lines = 'baseTooLarge'

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
  const lines = parsedLines(values.lines)
  const baseCents = sumLinesCents(lines)
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
    concept: summarizeLines(lines),
    lines,
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
