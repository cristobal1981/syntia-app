import type { InvoiceLine } from '@/src/modules/facturacion/domain/types'

/** Máximo de líneas por factura: evita documentos imposibles de leer. */
export const MAX_INVOICE_LINES = 50
export const MAX_LINE_DESCRIPTION_LENGTH = 300
export const MAX_QUANTITY = 999_999

/** Importe de una línea en céntimos: cantidad (hasta 3 decimales) por precio unitario, redondeado al céntimo. */
export function lineTotalCents(line: Pick<InvoiceLine, 'quantity' | 'unitPriceCents'>): number {
  const thousandths = Math.round(line.quantity * 1000)
  const magnitude = Math.round((Math.abs(thousandths) * Math.abs(line.unitPriceCents)) / 1000)
  return (thousandths < 0) !== (line.unitPriceCents < 0) ? -magnitude : magnitude
}

/** Base imponible de la factura: la suma de sus líneas. */
export function sumLinesCents(lines: readonly Pick<InvoiceLine, 'quantity' | 'unitPriceCents'>[]): number {
  return lines.reduce((total, line) => total + lineTotalCents(line), 0)
}

/** Texto corto para listas y buscador: la primera descripción y cuántas líneas más hay. */
export function summarizeLines(lines: readonly Pick<InvoiceLine, 'description'>[]): string {
  const first = lines.find((line) => line.description.trim())?.description.trim() ?? ''
  const rest = lines.length - 1
  return first && rest > 0 ? `${first} (+${rest} más)` : first
}

/** `2`, `1,5` → número; `null` si no es una cantidad mayor que cero con hasta 3 decimales. */
export function parseQuantity(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.')
  if (!/^\d+(\.\d{1,3})?$/.test(cleaned)) return null
  const value = Number(cleaned)
  return value > 0 && value <= MAX_QUANTITY ? value : null
}

export function formatQuantity(quantity: number): string {
  return String(quantity).replace('.', ',')
}

/** Una factura sin líneas (guardada antes de existir las líneas) pasa a tener una con su concepto y su base. */
export function linesFromLegacy(invoice: { id: string; concept: string; baseCents: number }): InvoiceLine[] {
  return [{ id: `${invoice.id}-l1`, description: invoice.concept, quantity: 1, unitPriceCents: invoice.baseCents }]
}
