import { describe, expect, it } from 'vitest'

import { getScrollEdges } from '@/src/modules/portal/lib/scroll-edges'

describe('getScrollEdges', () => {
  it('sin desbordamiento no hay nada oculto', () => {
    expect(getScrollEdges({ scrollTop: 0, clientHeight: 400, scrollHeight: 400 })).toEqual({ top: false, bottom: false })
  })

  it('arriba del todo solo hay contenido por debajo', () => {
    expect(getScrollEdges({ scrollTop: 0, clientHeight: 400, scrollHeight: 900 })).toEqual({ top: false, bottom: true })
  })

  it('a mitad hay contenido por los dos lados', () => {
    expect(getScrollEdges({ scrollTop: 200, clientHeight: 400, scrollHeight: 900 })).toEqual({ top: true, bottom: true })
  })

  it('abajo del todo solo hay contenido por encima', () => {
    expect(getScrollEdges({ scrollTop: 500, clientHeight: 400, scrollHeight: 900 })).toEqual({ top: true, bottom: false })
  })

  it('ignora diferencias de un par de píxeles por redondeo', () => {
    expect(getScrollEdges({ scrollTop: 1, clientHeight: 400, scrollHeight: 401 })).toEqual({ top: false, bottom: false })
    expect(getScrollEdges({ scrollTop: 499, clientHeight: 400.5, scrollHeight: 900 })).toEqual({ top: true, bottom: false })
  })

  it('un píxel por encima de la tolerancia ya cuenta', () => {
    expect(getScrollEdges({ scrollTop: 3, clientHeight: 400, scrollHeight: 400 }).top).toBe(true)
    expect(getScrollEdges({ scrollTop: 0, clientHeight: 400, scrollHeight: 403 }).bottom).toBe(true)
  })
})
