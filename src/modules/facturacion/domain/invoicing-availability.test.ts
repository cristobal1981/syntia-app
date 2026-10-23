import { describe, expect, it } from 'vitest'

import { isInvoicingMockEnabled } from '@/src/modules/facturacion/domain/invoicing-availability'

describe('isInvoicingMockEnabled', () => {
  it('en local (sin VERCEL) está activo', () => {
    expect(isInvoicingMockEnabled({})).toBe(true)
  })

  it.each(['1', 'true'])('en Vercel (VERCEL=%s) queda apagado, sea develop, main o un preview', (value) => {
    expect(isInvoicingMockEnabled({ VERCEL: value })).toBe(false)
  })

  it('en Vercel se abre solo si se activa a propósito con INVOICING_MOCK_ENABLED=1', () => {
    expect(isInvoicingMockEnabled({ VERCEL: '1', INVOICING_MOCK_ENABLED: '1' })).toBe(true)
  })

  it.each(['0', 'true', 'yes', ''])(
    'cualquier otro valor de INVOICING_MOCK_ENABLED (%j) no la abre en Vercel',
    (value) => {
      expect(isInvoicingMockEnabled({ VERCEL: '1', INVOICING_MOCK_ENABLED: value })).toBe(false)
    }
  )

  it('VERCEL vacío cuenta como no definido', () => {
    expect(isInvoicingMockEnabled({ VERCEL: '' })).toBe(true)
  })
})
