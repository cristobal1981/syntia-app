import { describe, expect, it } from 'vitest'

import {
  formatQuantity,
  linesFromLegacy,
  lineTotalCents,
  parseQuantity,
  summarizeLines,
  sumLinesCents,
} from '@/src/modules/facturacion/domain/invoice-lines'

describe('lineTotalCents', () => {
  it('multiplica cantidad por precio y redondea al céntimo', () => {
    expect(lineTotalCents({ quantity: 2, unitPriceCents: 1050 })).toBe(2100)
    expect(lineTotalCents({ quantity: 1.5, unitPriceCents: 1050 })).toBe(1575)
    expect(lineTotalCents({ quantity: 0.333, unitPriceCents: 100 })).toBe(33)
    expect(lineTotalCents({ quantity: 0.005, unitPriceCents: 100 })).toBe(1)
  })

  it('conserva el signo (rectificativas) de forma simétrica', () => {
    expect(lineTotalCents({ quantity: 1, unitPriceCents: -30000 })).toBe(-30000)
    expect(lineTotalCents({ quantity: 0.005, unitPriceCents: -100 })).toBe(-1)
    expect(lineTotalCents({ quantity: 0.005, unitPriceCents: 100 })).toBe(-lineTotalCents({ quantity: 0.005, unitPriceCents: -100 }))
  })

  it('no arrastra errores de coma flotante', () => {
    expect(lineTotalCents({ quantity: 1.1, unitPriceCents: 1000 })).toBe(1100)
    expect(lineTotalCents({ quantity: 3, unitPriceCents: 3333 })).toBe(9999)
  })
})

describe('sumLinesCents', () => {
  it('suma las líneas y una lista vacía vale cero', () => {
    expect(sumLinesCents([])).toBe(0)
    expect(
      sumLinesCents([
        { quantity: 2, unitPriceCents: 1000 },
        { quantity: 1, unitPriceCents: 550 },
      ])
    ).toBe(2550)
  })
})

describe('summarizeLines', () => {
  it('la primera descripción y cuántas más hay', () => {
    expect(summarizeLines([])).toBe('')
    expect(summarizeLines([{ description: ' Logo ' }])).toBe('Logo')
    expect(summarizeLines([{ description: 'Logo' }, { description: 'Web' }, { description: 'SEO' }])).toBe('Logo (+2 más)')
  })

  it('salta las descripciones vacías al elegir la primera', () => {
    expect(summarizeLines([{ description: ' ' }, { description: 'Web' }])).toBe('Web (+1 más)')
  })
})

describe('parseQuantity', () => {
  it.each([
    ['1', 1],
    ['2,5', 2.5],
    ['0.125', 0.125],
    [' 3 ', 3],
    ['999999', 999999],
  ])('acepta «%s»', (raw, expected) => {
    expect(parseQuantity(raw)).toBe(expected)
  })

  it.each(['', '0', '0,000', '-1', 'abc', '1,2345', '1.000.000', '1000000', '1,', '1e3'])('rechaza «%s»', (raw) => {
    expect(parseQuantity(raw)).toBeNull()
  })
})

describe('formatQuantity / linesFromLegacy', () => {
  it('formatea con coma decimal', () => {
    expect(formatQuantity(1.5)).toBe('1,5')
    expect(formatQuantity(2)).toBe('2')
  })

  it('una factura antigua pasa a tener una línea con su concepto y su base', () => {
    expect(linesFromLegacy({ id: 'f1', concept: 'Diseño', baseCents: 12345 })).toEqual([
      { id: 'f1-l1', description: 'Diseño', quantity: 1, unitPriceCents: 12345 },
    ])
  })
})
