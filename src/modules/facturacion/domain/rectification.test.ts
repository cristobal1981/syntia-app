import { describe, expect, it } from 'vitest'

import { computeInvoiceAmounts } from '@/src/modules/facturacion/domain/compute-invoice'
import {
  buildRectificationDraft,
  canRectify,
  netAmountsAfterRectification,
  rectificationsOf,
  validateRectification,
} from '@/src/modules/facturacion/domain/rectification'
import { makeInvoice } from '@/src/modules/facturacion/domain/test-fixtures'

const original = makeInvoice({ id: 'orig', ...computeInvoiceAmounts(100000, 7, 15) })

function rectificativa(id: string, deltaBase: number, overrides = {}) {
  return makeInvoice({
    id,
    kind: 'rectificativa',
    series: 'R',
    rectifies: 'orig',
    invoiceNumber: `R-2026-${id}`,
    issueDate: '2026-02-01',
    ...computeInvoiceAmounts(deltaBase, 7, 15),
    ...overrides,
  })
}

describe('canRectify', () => {
  it('solo una ordinaria ya expedida', () => {
    expect(canRectify(original)).toBe(true)
    expect(canRectify(makeInvoice({ status: 'borrador' }))).toBe(false)
    expect(canRectify(rectificativa('a', -100))).toBe(false)
  })
})

describe('rectificationsOf / netAmountsAfterRectification', () => {
  it('suma las rectificativas expedidas de esa factura y nada más', () => {
    const all = [
      original,
      rectificativa('a', -20000),
      rectificativa('b', 5000),
      rectificativa('x', -9999, { rectifies: 'otra' }),
      rectificativa('d', -7777, { status: 'borrador' }),
    ]
    expect(rectificationsOf(original, all).map((invoice) => invoice.id)).toEqual(['a', 'b'])

    const net = netAmountsAfterRectification(original, all)
    expect(net.baseCents).toBe(100000 - 20000 + 5000)
    expect(net.totalCents).toBe(original.totalCents + all[1].totalCents + all[2].totalCents)
  })

  it('sin rectificativas los importes vigentes son los originales', () => {
    expect(netAmountsAfterRectification(original, [original]).baseCents).toBe(100000)
  })
})

describe('buildRectificationDraft', () => {
  it('total: anula exactamente lo facturado, con los importes en negativo', () => {
    const draft = buildRectificationDraft(original, [original], { mode: 'total', reason: ' Error de facturación ', issueDate: '2026-03-01' })

    expect(draft).toMatchObject({
      kind: 'rectificativa',
      status: 'borrador',
      rectifies: 'orig',
      rectificationReason: 'Error de facturación',
      baseCents: -100000,
      taxCents: -original.taxCents,
      withholdingCents: -original.withholdingCents,
      totalCents: -original.totalCents,
      issueDate: '2026-03-01',
    })
  })

  it('la rectificativa lleva una única línea con el concepto y la base con signo', () => {
    const draft = buildRectificationDraft(original, [original], { mode: 'parcial', reason: 'x', issueDate: '2026-03-01', deltaBaseCents: -30000 })
    expect(draft.lines).toHaveLength(1)
    expect(draft.lines[0]).toMatchObject({ description: draft.concept, quantity: 1, unitPriceCents: -30000 })
    expect(draft.baseCents).toBe(-30000)
  })

  it('copia los datos del tercero y el régimen de la factura rectificada', () => {
    const draft = buildRectificationDraft(original, [original], { mode: 'total', reason: 'x', issueDate: '2026-03-01' })
    expect(draft).toMatchObject({
      counterpartyName: original.counterpartyName,
      counterpartyTaxId: original.counterpartyTaxId,
      counterpartyAddress: original.counterpartyAddress,
      regime: original.regime,
      taxRate: original.taxRate,
      withholdingRate: original.withholdingRate,
      invoiceNumber: '',
    })
    expect(draft.concept).toContain(original.invoiceNumber)
  })

  it('parcial: consigna la variación con signo y recalcula cuota y retención', () => {
    const draft = buildRectificationDraft(original, [original], {
      mode: 'parcial',
      reason: 'Descuento',
      issueDate: '2026-03-01',
      deltaBaseCents: -30000,
    })
    expect(draft).toMatchObject({
      baseCents: -30000,
      taxCents: -2100,
      withholdingCents: -4500,
      totalCents: -30000 - 2100 + 4500,
    })
  })

  it('total tras una parcial: anula solo lo que queda vigente', () => {
    const partial = rectificativa('a', -30000)
    const draft = buildRectificationDraft(original, [original, partial], { mode: 'total', reason: 'x', issueDate: '2026-03-01' })
    expect(draft.baseCents).toBe(-70000)
    expect(draft.baseCents + 100000 + partial.baseCents).toBe(0)
  })

  it('la parcial negativa es exactamente la negación de la positiva (sin descuadres de céntimo)', () => {
    const odd = makeInvoice({ id: 'o', ...computeInvoiceAmounts(1001, 9.5, 15) })
    const down = buildRectificationDraft(odd, [odd], { mode: 'parcial', reason: 'x', issueDate: '2026-03-01', deltaBaseCents: -1001 })
    expect(down.taxCents).toBe(-odd.taxCents)
    expect(down.withholdingCents).toBe(-odd.withholdingCents)
    expect(down.totalCents).toBe(-odd.totalCents)
  })
})

describe('validateRectification', () => {
  const input = { mode: 'total' as const, reason: 'Error', issueDate: '2026-03-01' }

  it('una rectificación correcta no tiene incidencias', () => {
    expect(validateRectification(original, [original], input)).toEqual([])
  })

  it('exige motivo', () => {
    expect(validateRectification(original, [original], { ...input, reason: '  ' })).toEqual(['reason'])
  })

  it('no se rectifica lo que no es rectificable', () => {
    expect(validateRectification(makeInvoice({ status: 'borrador' }), [], input)).toEqual(['not_rectifiable'])
  })

  it('no se puede rectificar de nuevo una factura ya anulada por completo', () => {
    const cancelled = rectificativa('a', -100000)
    expect(validateRectification(original, [original, cancelled], input)).toEqual(['already_rectified'])
  })

  it('parcial: la variación no puede ser cero ni dejar la factura en negativo', () => {
    const base = { mode: 'parcial' as const, reason: 'Error', issueDate: '2026-03-01' }
    expect(validateRectification(original, [original], { ...base, deltaBaseCents: 0 })).toEqual(['delta_zero'])
    expect(validateRectification(original, [original], { ...base, deltaBaseCents: -100001 })).toEqual(['exceeds_original'])
    expect(validateRectification(original, [original], { ...base, deltaBaseCents: -100000 })).toEqual([])
    expect(validateRectification(original, [original], { ...base, deltaBaseCents: 500 })).toEqual([])
  })

  it('el límite tiene en cuenta las rectificaciones anteriores', () => {
    const base = { mode: 'parcial' as const, reason: 'Error', issueDate: '2026-03-01' }
    const earlier = rectificativa('a', -60000)
    expect(validateRectification(original, [original, earlier], { ...base, deltaBaseCents: -40001 })).toEqual(['exceeds_original'])
    expect(validateRectification(original, [original, earlier], { ...base, deltaBaseCents: -40000 })).toEqual([])
  })
})
