import { describe, expect, it } from 'vitest'

import { formatAssigneesLabel } from '@/src/modules/tramites/domain/format-assignees'

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
