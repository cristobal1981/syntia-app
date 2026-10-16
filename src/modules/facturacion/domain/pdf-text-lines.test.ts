import { describe, expect, it } from 'vitest'

import { groupTextItemsIntoLines } from '@/src/modules/facturacion/domain/pdf-text-lines'

describe('groupTextItemsIntoLines', () => {
  it('ordena de arriba abajo y de izquierda a derecha', () => {
    expect(
      groupTextItemsIntoLines([
        { str: '225,24 €', x: 400, y: 100 },
        { str: 'Total factura', x: 50, y: 100 },
        { str: 'FACTURA', x: 50, y: 700 },
      ])
    ).toEqual(['FACTURA', 'Total factura 225,24 €'])
  })

  it('agrupa trozos con pequeñas diferencias de altura en la misma línea', () => {
    expect(
      groupTextItemsIntoLines([
        { str: 'IGIC 7 %', x: 50, y: 200 },
        { str: '14,74 €', x: 400, y: 198.5 },
      ])
    ).toEqual(['IGIC 7 % 14,74 €'])
  })

  it('separa líneas más distantes que la tolerancia', () => {
    expect(
      groupTextItemsIntoLines([
        { str: 'A', x: 0, y: 100 },
        { str: 'B', x: 0, y: 90 },
      ])
    ).toEqual(['A', 'B'])
  })

  it('descarta los trozos vacíos y recorta espacios', () => {
    expect(
      groupTextItemsIntoLines([
        { str: '   ', x: 0, y: 100 },
        { str: ' Hola ', x: 0, y: 50 },
      ])
    ).toEqual(['Hola'])
  })

  it('sin texto no hay líneas', () => {
    expect(groupTextItemsIntoLines([])).toEqual([])
  })
})
