import { describe, expect, it } from 'vitest'

import {
  addCompanyIds,
  filterCompanies,
  resolveSelectedCompanies,
  toggleCompanyId,
} from '@/src/modules/automatizaciones/domain/odoo-company-selection'

const companies = [
  { id: 1, name: 'Acme SL' },
  { id: 2, name: 'Bravo SA' },
  { id: 3, name: 'acme Norte SLU' },
  { id: 4, name: 'Zeta' },
]

describe('resolveSelectedCompanies', () => {
  it('devuelve las seleccionadas en el orden en que se marcaron, no en el del catálogo', () => {
    expect(resolveSelectedCompanies(companies, [4, 1])).toEqual([
      { id: 4, name: 'Zeta' },
      { id: 1, name: 'Acme SL' },
    ])
  })

  it('conserva un id que ya no está en el catálogo (name null) para poder verlo y quitarlo', () => {
    expect(resolveSelectedCompanies(companies, [2, 999])).toEqual([
      { id: 2, name: 'Bravo SA' },
      { id: 999, name: null },
    ])
  })

  it('sin selección o sin catálogo no inventa nada', () => {
    expect(resolveSelectedCompanies(companies, [])).toEqual([])
    expect(resolveSelectedCompanies([], [1])).toEqual([{ id: 1, name: null }])
  })
})

describe('filterCompanies', () => {
  const none = { query: '', onlySelected: false, selectedIds: [] as number[] }

  it('sin filtros devuelve todo, en el orden del catálogo', () => {
    expect(filterCompanies(companies, none)).toEqual(companies)
  })

  it('busca por nombre sin distinguir mayúsculas y ignora espacios alrededor', () => {
    expect(filterCompanies(companies, { ...none, query: '  ACME ' }).map((c) => c.id)).toEqual([1, 3])
  })

  it('«solo seleccionadas» deja solo las marcadas', () => {
    expect(
      filterCompanies(companies, { query: '', onlySelected: true, selectedIds: [4, 2] }).map((c) => c.id)
    ).toEqual([2, 4])
  })

  it('«solo seleccionadas» y búsqueda se combinan (AND), no se suman', () => {
    expect(
      filterCompanies(companies, { query: 'acme', onlySelected: true, selectedIds: [3, 2] }).map((c) => c.id)
    ).toEqual([3])
  })

  it('«solo seleccionadas» sin ninguna marcada da lista vacía (la interfaz lo desactiva antes)', () => {
    expect(filterCompanies(companies, { query: '', onlySelected: true, selectedIds: [] })).toEqual([])
  })

  it('una búsqueda sin coincidencias da lista vacía', () => {
    expect(filterCompanies(companies, { ...none, query: 'nada' })).toEqual([])
  })
})

describe('toggleCompanyId', () => {
  it('añade al final si no estaba y quita si estaba, sin tocar el resto ni su orden', () => {
    expect(toggleCompanyId([3, 1], 2)).toEqual([3, 1, 2])
    expect(toggleCompanyId([3, 1, 2], 1)).toEqual([3, 2])
  })

  it('no muta el array recibido', () => {
    const original = [1, 2]
    toggleCompanyId(original, 3)
    toggleCompanyId(original, 1)
    expect(original).toEqual([1, 2])
  })
})

describe('addCompanyIds («seleccionar visibles»)', () => {
  it('suma a la selección existente sin reemplazarla ni duplicar', () => {
    expect(addCompanyIds([4, 1], [companies[0], companies[1]])).toEqual([4, 1, 2])
  })

  it('conserva una selección que no está entre las visibles', () => {
    expect(addCompanyIds([999], [companies[1]])).toEqual([999, 2])
  })

  it('sin visibles no cambia nada', () => {
    expect(addCompanyIds([1, 2], [])).toEqual([1, 2])
  })
})
