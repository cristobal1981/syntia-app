/** Un producto o servicio del catálogo: da el precio inicial de la línea al facturar. */
export type Product = {
  id: string
  name: string
  /** Precio unitario sin impuestos, en céntimos. */
  priceCents: number
}

export type ProductErrorKey = 'nameRequired' | 'priceInvalid' | 'priceTooLarge' | 'tooLong'

const MAX_NAME_LENGTH = 120
const MAX_PRICE_CENTS = 999_999_999

export function validateProduct(product: Product): Partial<Record<keyof Product, ProductErrorKey>> {
  const errors: Partial<Record<keyof Product, ProductErrorKey>> = {}
  if (!product.name.trim()) errors.name = 'nameRequired'
  else if (product.name.trim().length > MAX_NAME_LENGTH) errors.name = 'tooLong'
  if (!Number.isInteger(product.priceCents) || product.priceCents <= 0) errors.priceCents = 'priceInvalid'
  else if (product.priceCents > MAX_PRICE_CENTS) errors.priceCents = 'priceTooLarge'
  return errors
}

export const SAMPLE_PRODUCTS: readonly Product[] = [
  { id: 'producto-identidad', name: 'Diseño de identidad visual', priceCents: 180000 },
  { id: 'producto-cartel', name: 'Diseño de cartelería', priceCents: 32000 },
  { id: 'producto-hora', name: 'Hora de diseño', priceCents: 4500 },
]
