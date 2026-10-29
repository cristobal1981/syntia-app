import { describe, expect, it } from 'vitest'

import { emitInvoice, validateEmission } from '@/src/modules/facturacion/domain/emission'
import { isLocked } from '@/src/modules/facturacion/domain/invoice-rules'
import { DEMO_ISSUER, EMPTY_ISSUER } from '@/src/modules/facturacion/domain/issuer'
import { makeInvoice } from '@/src/modules/facturacion/domain/test-fixtures'
import { completeCif } from '@/src/modules/facturacion/domain/tax-id'
import type { Invoice } from '@/src/modules/facturacion/domain/types'

const NOW = new Date(2026, 5, 15, 12, 30) // 15 de junio de 2026, hora local
const TODAY = '2026-06-15'

function draft(overrides: Partial<Invoice> = {}): Invoice {
  return makeInvoice({
    id: 'd1',
    status: 'borrador',
    invoiceNumber: '',
    series: '',
    sequence: null,
    issuedAt: null,
    issueDate: TODAY,
    counterpartyTaxId: completeCif('B3512345'),
    ...overrides,
  })
}

const codes = (invoice: Invoice, all: Invoice[] = []) =>
  validateEmission(invoice, DEMO_ISSUER, all, TODAY).map((issue) => issue.code)

describe('validateEmission — contenido mínimo de la factura (art. 6)', () => {
  it('un borrador completo no tiene incidencias', () => {
    expect(codes(draft())).toEqual([])
  })

  it('exige los datos del emisor', () => {
    expect(validateEmission(draft(), EMPTY_ISSUER, [], TODAY).map((i) => i.code)).toContain('issuer_incomplete')
  })

  it('exige nombre, NIF válido y domicilio del destinatario', () => {
    expect(codes(draft({ counterpartyName: ' ' }))).toEqual(['counterparty_name'])
    expect(codes(draft({ counterpartyTaxId: '' }))).toEqual(['counterparty_tax_id'])
    expect(codes(draft({ counterpartyTaxId: 'B35123456' }))).toEqual(['counterparty_tax_id'])
    expect(codes(draft({ counterpartyAddress: '' }))).toEqual(['counterparty_address'])
  })

  it('exige la descripción de la operación y un importe mayor que cero', () => {
    expect(codes(draft({ concept: '' }))).toEqual(['concept'])
    expect(codes(draft({ baseCents: 0 }))).toEqual(['amount'])
    expect(codes(draft({ baseCents: -100 }))).toEqual(['amount'])
  })

  it('solo se expide un borrador', () => {
    expect(codes(makeInvoice())).toEqual(['not_issuable'])
  })
})

describe('validateEmission — fecha y orden cronológico', () => {
  it('no se puede expedir con fecha futura', () => {
    expect(codes(draft({ issueDate: '2026-06-16' }))).toEqual(['date_in_future'])
    expect(codes(draft({ issueDate: TODAY }))).toEqual([])
  })

  it('no puede ser anterior a la última factura expedida de la serie', () => {
    const previous = makeInvoice({ issueDate: '2026-06-10' })
    expect(codes(draft({ issueDate: '2026-06-09', dateReason: 'Trabajo de junio' }), [previous])).toEqual([
      'date_before_previous',
    ])
    expect(codes(draft({ issueDate: '2026-06-10', dateReason: 'Trabajo de junio' }), [previous])).toEqual([])
  })

  it('la fecha de otra serie no condiciona', () => {
    const rectificativa = makeInvoice({ id: 'r', series: 'R', kind: 'rectificativa', issueDate: '2026-06-14' })
    expect(codes(draft({ issueDate: '2026-06-01', dateReason: 'Trabajo de junio' }), [rectificativa])).toEqual([])
  })

  it('una fecha anterior a hoy exige motivo; la de hoy no', () => {
    expect(codes(draft({ issueDate: '2026-06-14' }))).toEqual(['date_reason_missing'])
    expect(codes(draft({ issueDate: '2026-06-14', dateReason: '   ' }))).toEqual(['date_reason_missing'])
    expect(codes(draft({ issueDate: '2026-06-14', dateReason: 'Entrega del día 14' }))).toEqual([])
    expect(codes(draft({ issueDate: TODAY }))).toEqual([])
  })
})

describe('validateEmission — rectificativas', () => {
  const original = makeInvoice({ id: 'orig' })
  const rectificativa = (overrides: Partial<Invoice> = {}) =>
    draft({ kind: 'rectificativa', rectifies: 'orig', rectificationReason: 'Error en el precio', baseCents: -5000, ...overrides })

  it('una rectificativa completa pasa, y admite importe negativo', () => {
    expect(codes(rectificativa(), [original])).toEqual([])
  })

  it('exige motivo y que la factura rectificada exista y esté expedida', () => {
    expect(codes(rectificativa({ rectificationReason: ' ' }), [original])).toEqual(['rectification_reason'])
    expect(codes(rectificativa(), [])).toEqual(['rectified_missing'])
    expect(codes(rectificativa({ rectifies: null }), [original])).toEqual(['rectified_missing'])
    expect(codes(rectificativa(), [{ ...original, status: 'borrador' }])).toEqual(['rectified_missing'])
  })

  it('el importe de una rectificativa no puede ser cero', () => {
    expect(codes(rectificativa({ baseCents: 0 }), [original])).toEqual(['amount'])
  })
})

describe('emitInvoice', () => {
  it('asigna el siguiente número de la serie, la bloquea y registra el momento', () => {
    const result = emitInvoice(draft(), DEMO_ISSUER, [], NOW)
    expect(result.ok).toBe(true)
    if (!result.ok) return

    expect(result.invoice).toMatchObject({
      status: 'definitiva',
      series: 'F',
      sequence: 1,
      invoiceNumber: 'F-2026-0001',
      issuedAt: NOW.toISOString(),
    })
    expect(isLocked(result.invoice)).toBe(true)
  })

  it('congela los datos del emisor en la factura', () => {
    const result = emitInvoice(draft(), DEMO_ISSUER, [], NOW)
    expect(result.ok && result.invoice.issuer).toEqual(DEMO_ISSUER)

    const changed = { ...DEMO_ISSUER, name: 'Otro nombre' }
    expect(result.ok && result.invoice.issuer?.name).not.toBe(changed.name)
  })

  it('la numeración es correlativa y sin saltos', () => {
    let all: Invoice[] = []
    const numbers: string[] = []
    for (let index = 0; index < 4; index += 1) {
      const result = emitInvoice(draft({ id: `d${index}` }), DEMO_ISSUER, all, NOW)
      if (!result.ok) throw new Error('debería poder expedirse')
      all = [...all, result.invoice]
      numbers.push(result.invoice.invoiceNumber)
    }
    expect(numbers).toEqual(['F-2026-0001', 'F-2026-0002', 'F-2026-0003', 'F-2026-0004'])
  })

  it('un intento fallido no consume número', () => {
    const failed = emitInvoice(draft({ concept: '' }), DEMO_ISSUER, [], NOW)
    expect(failed.ok).toBe(false)
    const ok = emitInvoice(draft(), DEMO_ISSUER, [], NOW)
    expect(ok.ok && ok.invoice.sequence).toBe(1)
  })

  it('el número usa el año de la fecha de la factura', () => {
    const previousYear = emitInvoice(draft({ issueDate: '2025-12-31', dateReason: 'Trabajo de diciembre' }), DEMO_ISSUER, [], NOW)
    expect(previousYear.ok && previousYear.invoice.invoiceNumber).toBe('F-2025-0001')
  })

  it('una rectificativa sale en la serie R, aparte de las facturas', () => {
    const original = makeInvoice({ id: 'orig' })
    const result = emitInvoice(
      draft({ kind: 'rectificativa', rectifies: 'orig', rectificationReason: 'Error', baseCents: -1000 }),
      DEMO_ISSUER,
      [original],
      NOW
    )
    expect(result.ok && result.invoice.invoiceNumber).toBe('R-2026-0001')
  })

  it('devuelve las incidencias y no toca nada si no se puede expedir', () => {
    const input = draft({ counterpartyAddress: '' })
    const copy = structuredClone(input)
    const result = emitInvoice(input, DEMO_ISSUER, [], NOW)
    expect(result).toEqual({ ok: false, issues: [{ code: 'counterparty_address', field: 'counterpartyAddress' }] })
    expect(input).toEqual(copy)
  })

  it('una factura ya expedida no se puede expedir otra vez', () => {
    const result = emitInvoice(makeInvoice(), DEMO_ISSUER, [], NOW)
    expect(result.ok).toBe(false)
  })
})
