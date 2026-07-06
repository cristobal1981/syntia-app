import {
  SIMPLIFIED_INVOICE_LIMIT_EUR,
  type InvoiceDraftInput,
} from '@/src/modules/facturacion/domain/types'

export type InvoiceDraftValidation =
  | { ok: true }
  | { ok: false; message: string }

export function validateInvoiceDraft(input: InvoiceDraftInput): InvoiceDraftValidation {
  const hasCustomer =
    (typeof input.customer.partnerId === 'number' && input.customer.partnerId > 0) ||
    Boolean(input.customer.name?.trim())

  if (!hasCustomer) {
    return { ok: false, message: 'Indica el cliente receptor de la factura.' }
  }

  if (!input.lines.length) {
    return { ok: false, message: 'La factura debe tener al menos una línea.' }
  }

  for (const line of input.lines) {
    if (!line.description.trim()) {
      return { ok: false, message: 'Cada línea necesita una descripción.' }
    }
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      return { ok: false, message: 'La cantidad de cada línea debe ser mayor que 0.' }
    }
    if (!Number.isFinite(line.priceUnit) || line.priceUnit < 0) {
      return { ok: false, message: 'El precio unitario no puede ser negativo.' }
    }
  }

  const baseTotal = input.lines.reduce(
    (sum, line) => sum + line.quantity * line.priceUnit,
    0
  )

  const identifiesRecipient =
    (typeof input.customer.partnerId === 'number' && input.customer.partnerId > 0) ||
    Boolean(input.customer.vat?.trim())

  if (!identifiesRecipient && baseTotal > SIMPLIFIED_INVOICE_LIMIT_EUR) {
    return {
      ok: false,
      message: `Por encima de ${SIMPLIFIED_INVOICE_LIMIT_EUR} € la factura no puede ser simplificada: añade el NIF del cliente.`,
    }
  }

  return { ok: true }
}
