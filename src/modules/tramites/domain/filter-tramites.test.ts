import { describe, expect, it } from 'vitest'

import {
  countTramitesForChip,
  defaultTramitesListFilters,
  filterTramitesList,
  hasActiveTramitesFilters,
  isTramitesFilterChipActive,
  toggleTramitesFilterChip,
} from '@/src/modules/tramites/domain/filter-tramites'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'

function task(id: number, state: string, isClosed = false): TramiteListItem {
  return {
    id,
    name: `Trámite ${id}`,
    kind: 'tramite',
    state,
    isClosed,
    attachmentCount: 0,
    modifiedAt: '2026-10-20 10:00:00',
    assignedNotifyPartnerIds: [],
    createdAt: '',
    priority: 0,
    assignees: [],
  }
}

const changes = task(1, '02_changes_requested')
const progress = task(2, '01_in_progress')
const done = task(3, '1_done', true)
const canceled = task(5, '1_canceled', true)
const consulta: TramiteListItem = {
  id: 4,
  name: 'Consulta',
  kind: 'consulta',
  isClosed: false,
  attachmentCount: 0,
  modifiedAt: '2026-10-20 10:00:00',
  assignedNotifyPartnerIds: [],
  createdAt: '',
  priority: 0,
  assignees: [],
}
const closedConsulta: TramiteListItem = { ...consulta, id: 6, name: 'Consulta cerrada', isClosed: true }
const items = [changes, progress, done, canceled, consulta, closedConsulta]

function withChips(...chips: Parameters<typeof toggleTramitesFilterChip>[1][]) {
  return chips.reduce(toggleTramitesFilterChip, defaultTramitesListFilters)
}

describe('sin chips', () => {
  it('muestra solo lo abierto', () => {
    expect(filterTramitesList(items, defaultTramitesListFilters)).toEqual([
      changes,
      progress,
      consulta,
    ])
  })
})

describe('chip «Requiere tu atención»', () => {
  it('muestra solo los trámites con cambios solicitados', () => {
    const filters = withChips('needsAttention')
    expect(filterTramitesList(items, filters)).toEqual([changes])
    expect(isTramitesFilterChipActive(filters, 'needsAttention')).toBe(true)
  })

  it('se cruza con el tipo', () => {
    expect(filterTramitesList(items, withChips('needsAttention', 'consulta'))).toEqual([])
    expect(filterTramitesList(items, withChips('needsAttention', 'tramite'))).toEqual([changes])
  })

  it('un cerrado nunca requiere atención, aunque su estado fuera ese', () => {
    const closedChanges = task(7, '02_changes_requested', true)
    expect(filterTramitesList([closedChanges], withChips('needsAttention'))).toEqual([])
  })

  it('activar «Cerrados» lo desactiva, y al revés: no pueden estar los dos', () => {
    expect(withChips('needsAttention', 'closed').chips).toEqual(['closed'])
    expect(withChips('closed', 'needsAttention').chips).toEqual(['needsAttention'])
    expect(withChips('consulta', 'needsAttention', 'closed').chips).toEqual(['consulta', 'closed'])
  })

  it('quitar el chip vuelve a lo abierto', () => {
    const off = toggleTramitesFilterChip(withChips('needsAttention'), 'needsAttention')
    expect(off.chips).toEqual([])
    expect(hasActiveTramitesFilters(off)).toBe(false)
  })
})

describe('chip «Cerrados»', () => {
  it('muestra solo los cerrados: hechos, cancelados y consultas cerradas', () => {
    expect(filterTramitesList(items, withChips('closed'))).toEqual([done, canceled, closedConsulta])
  })

  it('se cruza con el tipo', () => {
    expect(filterTramitesList(items, withChips('closed', 'consulta'))).toEqual([closedConsulta])
    expect(filterTramitesList(items, withChips('closed', 'tramite'))).toEqual([done, canceled])
  })
})

describe('chips de tipo', () => {
  it('son excluyentes entre sí solo en el contador, y se suman (O) al filtrar', () => {
    expect(filterTramitesList(items, withChips('tramite'))).toEqual([changes, progress])
    expect(filterTramitesList(items, withChips('consulta'))).toEqual([consulta])
    expect(filterTramitesList(items, withChips('tramite', 'consulta'))).toEqual([
      changes,
      progress,
      consulta,
    ])
  })
})

describe('búsqueda', () => {
  it('ignora tildes y mayúsculas y respeta los chips', () => {
    const filters = { ...withChips('closed'), query: 'CONSULTA' }
    expect(filterTramitesList(items, filters)).toEqual([closedConsulta])
    expect(hasActiveTramitesFilters({ ...defaultTramitesListFilters, query: ' ' })).toBe(false)
    expect(hasActiveTramitesFilters({ ...defaultTramitesListFilters, query: 'a' })).toBe(true)
  })
})

describe('contadores facetados', () => {
  it('cuentan lo que saldría al activar ese chip con el resto como está', () => {
    expect(countTramitesForChip(items, 'needsAttention', defaultTramitesListFilters)).toBe(1)
    expect(countTramitesForChip(items, 'closed', defaultTramitesListFilters)).toBe(3)
    expect(countTramitesForChip(items, 'tramite', defaultTramitesListFilters)).toBe(2)
    expect(countTramitesForChip(items, 'consulta', defaultTramitesListFilters)).toBe(1)
  })

  it('respetan el resto de filtros', () => {
    expect(countTramitesForChip(items, 'needsAttention', withChips('consulta'))).toBe(0)
    expect(countTramitesForChip(items, 'closed', withChips('consulta'))).toBe(1)
    expect(countTramitesForChip(items, 'consulta', withChips('closed'))).toBe(1)
  })

  it('el contador de un estado ignora el otro estado activo', () => {
    expect(countTramitesForChip(items, 'closed', withChips('needsAttention'))).toBe(3)
    expect(countTramitesForChip(items, 'needsAttention', withChips('closed'))).toBe(1)
  })

  it('el contador de un tipo no hereda el otro tipo activo', () => {
    expect(countTramitesForChip(items, 'tramite', withChips('consulta'))).toBe(2)
    expect(countTramitesForChip(items, 'consulta', withChips('tramite'))).toBe(1)
  })

  it('respetan la búsqueda', () => {
    const filters = { ...defaultTramitesListFilters, query: 'Trámite 2' }
    expect(countTramitesForChip(items, 'tramite', filters)).toBe(1)
    expect(countTramitesForChip(items, 'closed', filters)).toBe(0)
  })
})
