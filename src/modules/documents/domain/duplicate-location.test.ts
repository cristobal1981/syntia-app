import { describe, expect, it } from 'vitest'

import { duplicateLocationCrumbs } from '@/src/modules/documents/domain/duplicate-location'

describe('duplicateLocationCrumbs', () => {
  it('empieza siempre por la etiqueta de inicio, nunca por el nombre de la carpeta raíz', () => {
    expect(duplicateLocationCrumbs(['Facturas', '2026'], 'Inicio')).toEqual([
      'Inicio',
      'Facturas',
      '2026',
    ])
  })

  it('en la raíz solo queda «Inicio»', () => {
    expect(duplicateLocationCrumbs([], 'Inicio')).toEqual(['Inicio'])
  })

  it('no modifica el array recibido', () => {
    const folders = ['A']
    duplicateLocationCrumbs(folders, 'Inicio')
    expect(folders).toEqual(['A'])
  })
})
