import { describe, expect, it } from 'vitest'

import {
  accountedInvoices,
  applyInvoiceChanges,
  canDeleteInvoice,
  isAccounted,
  isLocked,
} from '@/src/modules/facturacion/domain/invoice-rules'
import { makeInvoice } from '@/src/modules/facturacion/domain/test-fixtures'

const issued = makeInvoice()
const draft = makeInvoice({ status: 'borrador', invoiceNumber: '', series: '', sequence: null, issuedAt: null })

describe('isLocked / isAccounted / canDeleteInvoice', () => {
  it('una factura expedida está bloqueada', () => {
    expect(isLocked(issued)).toBe(true)
    expect(canDeleteInvoice(issued)).toBe(false)
  })

  it('un borrador no está bloqueado y se puede borrar', () => {
    expect(isLocked(draft)).toBe(false)
    expect(canDeleteInvoice(draft)).toBe(true)
  })

  it('solo las definitivas cuentan para la contabilidad', () => {
    expect(isAccounted(issued)).toBe(true)
    expect(isAccounted(draft)).toBe(false)
    expect(accountedInvoices([issued, draft])).toEqual([issued])
  })
})

describe('applyInvoiceChanges — factura expedida', () => {
  it('rechaza cambiar cualquier dato de la factura y dice cuáles', () => {
    const result = applyInvoiceChanges(issued, { baseCents: 5, counterpartyName: 'Otro', concept: 'Otra cosa' })
    expect(result).toEqual({ ok: false, error: 'locked', fields: ['baseCents', 'counterpartyName', 'concept'] })
  })

  it('cambiar las líneas se rechaza, pero volver a guardar las mismas (otra copia) no', () => {
    const same = issued.lines.map((line) => ({ ...line }))
    expect(applyInvoiceChanges(issued, { lines: same }).ok).toBe(true)
    const changed = same.map((line) => ({ ...line, quantity: line.quantity + 1 }))
    expect(applyInvoiceChanges(issued, { lines: changed })).toEqual({ ok: false, error: 'locked', fields: ['lines'] })
  })

  it.each([
    ['la fecha', { issueDate: '2026-02-01' }],
    ['el número', { invoiceNumber: 'F-2026-0099' }],
    ['el NIF', { counterpartyTaxId: 'B00000000' }],
    ['el estado', { status: 'borrador' as const }],
    ['la serie', { series: 'X' }],
    ['la rectificada', { rectifies: 'otra' }],
    ['el instante de expedición', { issuedAt: '2030-01-01T00:00:00.000Z' }],
  ])('rechaza cambiar %s', (_label, changes) => {
    expect(applyInvoiceChanges(issued, changes).ok).toBe(false)
  })

  it('permite registrar el cobro y la revisión, que no son parte de la factura', () => {
    const result = applyInvoiceChanges(issued, { paymentDate: '2026-02-01', review: 'revisada' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.invoice).toMatchObject({ paymentDate: '2026-02-01', review: 'revisada', baseCents: issued.baseCents })
  })

  it('un cambio que deja el mismo valor no cuenta como modificación', () => {
    expect(applyInvoiceChanges(issued, { baseCents: issued.baseCents, paymentDate: '2026-02-01' }).ok).toBe(true)
  })

  it('mezclar un cambio permitido con uno prohibido lo rechaza todo', () => {
    const result = applyInvoiceChanges(issued, { paymentDate: '2026-02-01', baseCents: 1 })
    expect(result).toEqual({ ok: false, error: 'locked', fields: ['baseCents'] })
  })

  it('no modifica el original', () => {
    const copy = structuredClone(issued)
    applyInvoiceChanges(issued, { baseCents: 1 })
    expect(issued).toEqual(copy)
  })
})

describe('applyInvoiceChanges — borradores', () => {
  it('un borrador admite cualquier cambio', () => {
    const result = applyInvoiceChanges(draft, { baseCents: 5, counterpartyName: 'Otro' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.invoice).toMatchObject({ baseCents: 5, counterpartyName: 'Otro' })
  })

})
