import { describe, expect, it } from 'vitest'

import type { TaxCalendarWindow } from '@/content/tax-calendar'
import { sappoWindowLine } from '@/src/modules/guias/domain/sappo-window-line'
import type { RelevantTaxWindow } from '@/src/modules/guias/domain/tax-calendar'

const window = (overrides: Partial<TaxCalendarWindow> = {}): TaxCalendarWindow => ({
  id: 'w',
  title: 'Resúmenes anuales',
  rangeLabel: '',
  start: { month: 1, day: 1 },
  end: { month: 1, day: 31 },
  modelCodes: ['303'],
  guideSlugs: [],
  ...overrides,
})

const relevant = (over: Partial<RelevantTaxWindow>): RelevantTaxWindow => ({
  window: window(),
  status: 'active',
  daysUntilStart: 0,
  daysUntilEnd: 5,
  ...over,
})

describe('sappoWindowLine', () => {
  it('no hay frase sin plazos', () => {
    expect(sappoWindowLine(undefined)).toBeNull()
  })

  it('plazo abierto: días restantes y modelo', () => {
    expect(sappoWindowLine(relevant({ daysUntilEnd: 5 }))).toBe(
      'Conste en acta: quedan 5 días para presentar el modelo 303.'
    )
  })

  it('plazo abierto: singular y último día', () => {
    expect(sappoWindowLine(relevant({ daysUntilEnd: 1 }))).toContain('queda 1 día')
    expect(sappoWindowLine(relevant({ daysUntilEnd: 0 }))).toContain('hoy es el último día')
  })

  it('varios modelos: lista hasta tres y resume el resto', () => {
    const line = sappoWindowLine(
      relevant({ window: window({ modelCodes: ['111', '115', '123', '130', '131'] }) })
    )
    expect(line).toContain('los modelos 111, 115, 123 y otros 2')
  })

  it('sin modelos usa el título', () => {
    const line = sappoWindowLine(relevant({ window: window({ modelCodes: [] }) }))
    expect(line).toContain('Resúmenes anuales')
  })

  it('plazo próximo: días hasta que abre', () => {
    expect(
      sappoWindowLine(relevant({ status: 'upcoming', daysUntilStart: 9, daysUntilEnd: 30 }))
    ).toBe('Atención: en 9 días se abre el plazo para presentar el modelo 303.')
    expect(
      sappoWindowLine(relevant({ status: 'upcoming', daysUntilStart: 1, daysUntilEnd: 30 }))
    ).toContain('mañana se abre')
  })
})
