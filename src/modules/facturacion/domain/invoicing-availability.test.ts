import { describe, expect, it } from 'vitest'

import { isInvoicingMockEnabled } from '@/src/modules/facturacion/domain/invoicing-availability'

describe('isInvoicingMockEnabled', () => {
  it('en local (sin VERCEL) está activo', () => {
    expect(isInvoicingMockEnabled({})).toBe(true)
  })

  it.each(['1', 'true'])('en Vercel (VERCEL=%s) queda apagado, sea develop, main o un preview', (value) => {
    expect(isInvoicingMockEnabled({ VERCEL: value })).toBe(false)
  })

  it('VERCEL vacío cuenta como no definido', () => {
    expect(isInvoicingMockEnabled({ VERCEL: '' })).toBe(true)
  })
})
