import { describe, expect, it } from 'vitest'

import { buildTramiteDatesLine, formatTramiteDate } from '@/src/modules/tramites/domain/format-tramite-date'

const NOW = new Date('2026-10-23T12:00:00Z')

describe('formatTramiteDate', () => {
  it('el día y el mes cortos, sin año si es el actual', () => {
    expect(formatTramiteDate('2026-10-22T12:00:00.000Z', { now: NOW })).toMatch(/^22 oct\.?$/)
  })

  it('con el año si es de otro año, o siempre si se pide', () => {
    expect(formatTramiteDate('2025-03-05T12:00:00.000Z', { now: NOW })).toMatch(/^5 mar\.? 2025$/)
    expect(formatTramiteDate('2026-10-22T12:00:00.000Z', { now: NOW, alwaysYear: true })).toMatch(/^22 oct\.? 2026$/)
  })

  it('usa la hora de Canarias, no la del servidor: a las 23:30 UTC de invierno ya es el día siguiente en verano', () => {
    // 2026-07-15 23:30 UTC = 2026-07-16 00:30 en Canarias (UTC+1 en verano).
    expect(formatTramiteDate('2026-07-15T23:30:00.000Z', { now: new Date('2026-07-20T00:00:00Z') })).toMatch(/^16 jul/)
    // En invierno Canarias es UTC+0: el mismo instante sigue siendo el día 15.
    expect(formatTramiteDate('2026-01-15T23:30:00.000Z', { now: new Date('2026-01-20T00:00:00Z') })).toMatch(/^15 ene/)
  })

  it('el año se compara en Canarias: el 31 de diciembre a las 23:30 UTC ya es otro año en verano pero no en invierno', () => {
    expect(formatTramiteDate('2025-12-31T23:30:00.000Z', { now: new Date('2026-06-01T00:00:00Z') })).toMatch(/2025/)
  })

  it('sin fecha o con algo que no es una fecha, vacío', () => {
    expect(formatTramiteDate('', { now: NOW })).toBe('')
    expect(formatTramiteDate('no es fecha', { now: NOW })).toBe('')
  })
})

describe('buildTramiteDatesLine', () => {
  it('apertura con año y actualización, unidas con un punto medio', () => {
    expect(
      buildTramiteDatesLine({ createdAt: '2026-10-01T08:30:00.000Z', modifiedAt: '2026-10-22T12:00:00.000Z' }, NOW)
    ).toMatch(/^Abierto el 1 oct\.? 2026 · Actualizado el 22 oct\.?$/)
  })

  it('con solo una de las dos, solo esa', () => {
    expect(buildTramiteDatesLine({ createdAt: '', modifiedAt: '2026-10-22T12:00:00.000Z' }, NOW)).toMatch(/^Actualizado el 22 oct/)
    expect(buildTramiteDatesLine({ createdAt: '2026-10-01T08:30:00.000Z', modifiedAt: '' }, NOW)).toMatch(/^Abierto el 1 oct/)
  })

  it('sin ninguna, null', () => {
    expect(buildTramiteDatesLine({ createdAt: '', modifiedAt: '' }, NOW)).toBeNull()
  })
})
