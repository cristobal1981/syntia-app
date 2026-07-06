/** Estado VERI*FACTU del registro de facturación asociado a la factura en Odoo. */
export type VerifactuState =
  | 'unknown'
  | 'not_sent'
  | 'queued'
  | 'sent_pending'
  | 'registered'
  | 'registered_with_errors'
  | 'rejected'
  | 'cancelled'

export type InvoiceStatus = 'draft' | 'posted' | 'cancel'

export type InvoiceCustomerInput = {
  /** res.partner.id existente dentro de la company del cliente. */
  partnerId?: number
  name?: string
  vat?: string
}

export type InvoiceLineInput = {
  description: string
  quantity: number
  priceUnit: number
}

export type InvoiceDraftInput = {
  customer: InvoiceCustomerInput
  lines: InvoiceLineInput[]
}

export type Invoice = {
  id: number
  /** Número de factura (p. ej. INV/2026/00001) o referencia de borrador. */
  name: string
  status: InvoiceStatus
  verifactuState: VerifactuState
  customerName?: string
  invoiceDate?: string
  amountUntaxed: number
  amountTax: number
  amountTotal: number
}

export type FacturacionErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_linked'
  | 'validation'
  | 'not_found'
  | 'send_failed'
  | 'odoo_unavailable'
  | 'odoo_rate_limited'

export type FacturacionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: FacturacionErrorCode; message?: string }

/** Límite general de factura simplificada (art. 4 Reglamento de facturación). */
export const SIMPLIFIED_INVOICE_LIMIT_EUR = 400
