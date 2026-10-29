import { describe, expect, it } from 'vitest'

import { initialInvoicingState, removeProduct, saveProduct } from '@/src/modules/facturacion/domain/invoicing-state'
import { SAMPLE_PRODUCTS, validateProduct } from '@/src/modules/facturacion/domain/products'

const context = { now: new Date('2026-06-15T10:00:00Z'), newId: () => 'ev' }

describe('validateProduct', () => {
  it('acepta un producto con nombre y precio', () => {
    expect(validateProduct({ id: 'p', name: 'Hora', priceCents: 4500 })).toEqual({})
  })

  it('exige nombre, con un máximo de 120', () => {
    expect(validateProduct({ id: 'p', name: '  ', priceCents: 100 }).name).toBe('nameRequired')
    expect(validateProduct({ id: 'p', name: 'x'.repeat(120), priceCents: 100 }).name).toBeUndefined()
    expect(validateProduct({ id: 'p', name: 'x'.repeat(121), priceCents: 100 }).name).toBe('tooLong')
  })

  it('exige un precio entero mayor que cero y con tope', () => {
    expect(validateProduct({ id: 'p', name: 'a', priceCents: 0 }).priceCents).toBe('priceInvalid')
    expect(validateProduct({ id: 'p', name: 'a', priceCents: -5 }).priceCents).toBe('priceInvalid')
    expect(validateProduct({ id: 'p', name: 'a', priceCents: 10.5 }).priceCents).toBe('priceInvalid')
    expect(validateProduct({ id: 'p', name: 'a', priceCents: 999_999_999 }).priceCents).toBeUndefined()
    expect(validateProduct({ id: 'p', name: 'a', priceCents: 1_000_000_000 }).priceCents).toBe('priceTooLarge')
  })
})

describe('saveProduct / removeProduct', () => {
  it('crea un producto nuevo, con el nombre recortado, y deja constancia', () => {
    const state = initialInvoicingState()
    const result = saveProduct(state, { id: 'nuevo', name: '  Rotulación  ', priceCents: 9000 }, context)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.products).toHaveLength(state.products.length + 1)
    expect(result.state.products.at(-1)).toEqual({ id: 'nuevo', name: 'Rotulación', priceCents: 9000 })
    expect(result.state.events.at(-1)?.summary).toBe('Producto Rotulación creado')
  })

  it('modifica uno existente sin duplicarlo', () => {
    const state = initialInvoicingState()
    const target = SAMPLE_PRODUCTS[0]
    const result = saveProduct(state, { ...target, priceCents: 1 }, context)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.products).toHaveLength(state.products.length)
    expect(result.state.products.find((product) => product.id === target.id)?.priceCents).toBe(1)
    expect(result.state.events.at(-1)?.summary).toContain('actualizado')
  })

  it('un producto inválido no cambia nada', () => {
    const state = initialInvoicingState()
    const result = saveProduct(state, { id: 'x', name: '', priceCents: 0 }, context)
    expect(result.ok).toBe(false)
    expect(result.state).toBe(state)
  })

  it('quitar un producto no toca las facturas', () => {
    const state = initialInvoicingState()
    const next = removeProduct(state, SAMPLE_PRODUCTS[0].id, context)
    expect(next.products.map((product) => product.id)).not.toContain(SAMPLE_PRODUCTS[0].id)
    expect(next.invoices).toBe(state.invoices)
    expect(removeProduct(state, 'no-existe', context)).toBe(state)
  })
})
