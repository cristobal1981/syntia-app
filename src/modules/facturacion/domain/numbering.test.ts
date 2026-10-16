import { describe, expect, it } from 'vitest'

import { formatInvoiceNumber, INVOICE_SERIES, lastIssueDate, nextSequence, verifyNumbering } from '@/src/modules/facturacion/domain/numbering'
import { makeInvoice } from '@/src/modules/facturacion/domain/test-fixtures'

describe('formatInvoiceNumber', () => {
  it('serie, año y número de orden con cuatro cifras', () => {
    expect(formatInvoiceNumber('F', 2026, 1)).toBe('F-2026-0001')
    expect(formatInvoiceNumber('R', 2026, 42)).toBe('R-2026-0042')
    expect(formatInvoiceNumber('F', 2027, 12345)).toBe('F-2027-12345')
  })

  it('las rectificativas tienen su propia serie', () => {
    expect(INVOICE_SERIES).toEqual({ ordinaria: 'F', rectificativa: 'R' })
  })
})

describe('nextSequence', () => {
  it('empieza en 1 si no hay facturas en la serie y el año', () => {
    expect(nextSequence([], 'F', 2026)).toBe(1)
  })

  it('continúa a partir del mayor número de la serie en ese año', () => {
    const invoices = [makeInvoice({ id: 'a', sequence: 1 }), makeInvoice({ id: 'b', sequence: 2 }), makeInvoice({ id: 'c', sequence: 7 })]
    expect(nextSequence(invoices, 'F', 2026)).toBe(8)
  })

  it('cada serie lleva su cuenta', () => {
    const invoices = [makeInvoice({ sequence: 5 }), makeInvoice({ id: 'r', series: 'R', kind: 'rectificativa', sequence: 2 })]
    expect(nextSequence(invoices, 'R', 2026)).toBe(3)
    expect(nextSequence(invoices, 'F', 2026)).toBe(6)
  })

  it('cada año empieza de nuevo', () => {
    const invoices = [makeInvoice({ sequence: 9, issueDate: '2026-12-31' })]
    expect(nextSequence(invoices, 'F', 2027)).toBe(1)
    expect(nextSequence(invoices, 'F', 2026)).toBe(10)
  })

  it('ignora borradores y recibidas', () => {
    const invoices = [
      makeInvoice({ id: 'd', status: 'borrador', sequence: 50 }),
      makeInvoice({ id: 'r', direction: 'recibida', sequence: 60 }),
      makeInvoice({ id: 'ok', sequence: 3 }),
    ]
    expect(nextSequence(invoices, 'F', 2026)).toBe(4)
  })
})

describe('lastIssueDate', () => {
  it('es la fecha de la factura expedida más reciente de la serie', () => {
    const invoices = [
      makeInvoice({ id: 'a', issueDate: '2026-03-01' }),
      makeInvoice({ id: 'b', issueDate: '2026-05-20' }),
      makeInvoice({ id: 'c', issueDate: '2026-04-10' }),
      makeInvoice({ id: 'r', series: 'R', kind: 'rectificativa', issueDate: '2026-09-01' }),
      makeInvoice({ id: 'd', status: 'borrador', issueDate: '2026-12-01' }),
    ]
    expect(lastIssueDate(invoices, 'F')).toBe('2026-05-20')
    expect(lastIssueDate(invoices, 'R')).toBe('2026-09-01')
  })

  it('sin facturas devuelve null', () => {
    expect(lastIssueDate([], 'F')).toBeNull()
  })
})

describe('verifyNumbering', () => {
  const ok = (sequence: number, overrides = {}) =>
    makeInvoice({
      id: `i${sequence}`,
      sequence,
      invoiceNumber: formatInvoiceNumber('F', 2026, sequence),
      issueDate: `2026-01-${String(sequence).padStart(2, '0')}`,
      ...overrides,
    })

  it('una numeración correlativa, sin saltos ni repetidos y en orden de fecha no tiene incidencias', () => {
    expect(verifyNumbering([ok(1), ok(2), ok(3)])).toEqual([])
  })

  it('sin facturas no hay incidencias', () => {
    expect(verifyNumbering([])).toEqual([])
  })

  it('detecta un salto en la numeración', () => {
    expect(verifyNumbering([ok(1), ok(3)])).toEqual([{ kind: 'gap', series: 'F', year: 2026, missing: 2 }])
  })

  it('detecta varios saltos y empieza a contar en 1', () => {
    expect(verifyNumbering([ok(3), ok(5)])).toEqual([
      { kind: 'gap', series: 'F', year: 2026, missing: 1 },
      { kind: 'gap', series: 'F', year: 2026, missing: 2 },
      { kind: 'gap', series: 'F', year: 2026, missing: 4 },
    ])
  })

  it('detecta un número repetido', () => {
    const issues = verifyNumbering([ok(1), ok(2), ok(2, { id: 'dup' })])
    expect(issues).toContainEqual({ kind: 'duplicate', series: 'F', year: 2026, sequence: 2 })
  })

  it('detecta un número que no coincide con su serie, año y orden', () => {
    const issues = verifyNumbering([ok(1), ok(2, { invoiceNumber: 'F-2026-0099' })])
    expect(issues).toEqual([{ kind: 'format', invoiceId: 'i2', invoiceNumber: 'F-2026-0099' }])
  })

  it('detecta una factura con fecha anterior a la de un número menor', () => {
    const issues = verifyNumbering([ok(1, { issueDate: '2026-03-10' }), ok(2, { issueDate: '2026-03-01' })])
    expect(issues).toEqual([{ kind: 'chronology', series: 'F', invoiceId: 'i2', invoiceNumber: 'F-2026-0002' }])
  })

  it('cada serie y cada año se verifican por separado', () => {
    const other = makeInvoice({ id: 'r1', series: 'R', kind: 'rectificativa', sequence: 1, invoiceNumber: 'R-2026-0001' })
    const nextYear = makeInvoice({ id: 'n1', sequence: 1, issueDate: '2027-01-05', invoiceNumber: 'F-2027-0001' })
    expect(verifyNumbering([ok(1), ok(2), other, nextYear])).toEqual([])
  })

  it('ignora borradores y recibidas', () => {
    expect(verifyNumbering([ok(1), makeInvoice({ id: 'd', status: 'borrador', sequence: 9 }), makeInvoice({ id: 'r', direction: 'recibida', sequence: 8 })])).toEqual([])
  })
})
