import { describe, expect, it } from 'vitest'

import { mapOdooCompanyRow } from '@/src/modules/automatizaciones/domain/odoo-company-option'

describe('mapOdooCompanyRow', () => {
  it('usa el nombre cuando lo hay (recortado), sin mezclar el correo', () => {
    expect(mapOdooCompanyRow({ id: 1, name: '  Acme SL ', email: 'info@acme.es' })).toEqual({
      id: 1,
      name: 'Acme SL',
    })
  })

  const blanks: Array<string | false | null | undefined> = [false, null, undefined, '', '   ']

  it.each(blanks)(
    'sin nombre (%j) identifica al cliente por su correo',
    (name) => {
      expect(mapOdooCompanyRow({ id: 2, name, email: ' ana@example.com ' })).toEqual({
        id: 2,
        name: 'ana@example.com',
      })
    }
  )

  it.each(blanks)(
    'sin nombre ni correo (%j) queda «Sin nombre»',
    (email) => {
      expect(mapOdooCompanyRow({ id: 3, name: false, email })).toEqual({ id: 3, name: 'Sin nombre' })
    }
  )

  it('un tipo raro (número) no cuenta como nombre ni como correo', () => {
    expect(
      mapOdooCompanyRow({ id: 4, name: 7 as unknown as string, email: 9 as unknown as string })
    ).toEqual({ id: 4, name: 'Sin nombre' })
  })

  it.each([0, -1, Number.NaN])('descarta un id no válido (%s)', (id) => {
    expect(mapOdooCompanyRow({ id, name: 'X', email: 'x@x.es' })).toBeNull()
  })
})
