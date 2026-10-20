export type InvoiceCategory = {
  id: string
  label: string
}

const INVOICE_CATEGORIES: readonly InvoiceCategory[] = [
  { id: 'ventas', label: 'Venta de productos' },
  { id: 'servicios', label: 'Prestación de servicios' },
]

export const DEFAULT_CATEGORY_ID = 'servicios'

export function categories(): readonly InvoiceCategory[] {
  return INVOICE_CATEGORIES
}

/** Si la categoría no existe (dato antiguo) se cae a la genérica. */
export function getCategory(id: string): InvoiceCategory {
  return INVOICE_CATEGORIES.find((category) => category.id === id) ?? INVOICE_CATEGORIES.find((category) => category.id === DEFAULT_CATEGORY_ID)!
}
