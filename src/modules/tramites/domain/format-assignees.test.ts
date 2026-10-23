import { describe, expect, it } from 'vitest'

import { assigneeKeyFor, formatAssigneesLabel } from '@/src/modules/tramites/domain/format-assignees'

const person = (userId: number, name: string) => ({ userId, name })

describe('formatAssigneesLabel', () => {
  it('sin nadie asignado no hay etiqueta', () => {
    expect(formatAssigneesLabel([])).toBeNull()
    expect(formatAssigneesLabel([person(1, '   ')])).toBeNull()
  })

  it('una persona: su nombre', () => {
    expect(formatAssigneesLabel([person(1, 'Ana García')])).toBe('Ana García')
  })

  it('dos personas: unidas con «y»', () => {
    expect(formatAssigneesLabel([person(1, 'Ana'), person(2, 'Bruno')])).toBe('Ana y Bruno')
  })

  it('tres o más: los dos primeros y cuántas más', () => {
    expect(formatAssigneesLabel([person(1, 'Ana'), person(2, 'Bruno'), person(3, 'Carla')])).toBe(
      'Ana, Bruno y 1 más'
    )
    expect(
      formatAssigneesLabel([person(1, 'Ana'), person(2, 'Bruno'), person(3, 'C'), person(4, 'D')])
    ).toBe('Ana, Bruno y 2 más')
  })

  it('recorta los espacios del nombre', () => {
    expect(formatAssigneesLabel([person(1, '  Ana ')])).toBe('Ana')
  })
})

describe('assigneeKeyFor', () => {
  it('es la lista de ids ordenada, sin repetidos y unida por comas', () => {
    expect(assigneeKeyFor([person(9, 'Luis'), person(3, 'Ana'), person(9, 'Luis')])).toBe('3,9')
  })

  it('nadie asignado es la cadena vacía', () => {
    expect(assigneeKeyFor([])).toBe('')
  })

  it('el mismo conjunto de personas da la misma huella en cualquier orden', () => {
    expect(assigneeKeyFor([person(1, 'a'), person(2, 'b')])).toBe(assigneeKeyFor([person(2, 'b'), person(1, 'a')]))
    expect(assigneeKeyFor([person(1, 'a')])).not.toBe(assigneeKeyFor([person(2, 'b')]))
  })
})
