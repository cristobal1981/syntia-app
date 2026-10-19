import type { Invoice } from '@/src/modules/facturacion/domain/types'

/** Texto comparable en una búsqueda: sin tildes, en minúsculas y con los espacios recortados. */
export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Una factura coincide si la consulta aparece (sin tildes ni mayúsculas) en cliente, NIF, número o concepto. */
export function invoiceMatchesQuery(invoice: Invoice, query: string): boolean {
  const needle = normalizeForSearch(query)
  if (!needle) return true
  return normalizeForSearch(
    [invoice.counterpartyName, invoice.counterpartyTaxId, invoice.invoiceNumber, invoice.concept].join(' ')
  ).includes(needle)
}
