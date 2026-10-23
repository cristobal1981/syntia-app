import { describe, expect, it } from 'vitest'

import {
  countTramitesForChip,
  defaultTramitesListFilters,
  filterTramitesList,
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
const items = [changes, progress, done, consulta]

describe('chip «Pendientes de ti»', () => {
  it('muestra solo los trámites con cambios solicitados', () => {
    const filters = toggleTramitesFilterChip(
      defaultTramitesListFilters,
      'needsAttention'
    )
    expect(filterTramitesList(items, filters)).toEqual([changes])
    expect(isTramitesFilterChipActive(filters, 'needsAttention')).toBe(true)
  })

  it('convive con el chip de tipo (se cruzan)', () => {
    let filters = toggleTramitesFilterChip(
      defaultTramitesListFilters,
      'needsAttention'
    )
    filters = toggleTramitesFilterChip(filters, 'consulta')
    expect(filterTramitesList(items, filters)).toEqual([])
  })

  it('el contador es facetado: respeta el resto de filtros', () => {
    expect(
      countTramitesForChip(items, 'needsAttention', defaultTramitesListFilters)
    ).toBe(1)
    const onlyConsultas = toggleTramitesFilterChip(
      defaultTramitesListFilters,
      'consulta'
    )
    expect(countTramitesForChip(items, 'needsAttention', onlyConsultas)).toBe(0)
  })

  it('«Todos» sigue ocultando cerrados sin el chip', () => {
    expect(filterTramitesList(items, defaultTramitesListFilters)).toEqual([
      changes,
      progress,
      consulta,
    ])
  })

  it('quitar el chip vuelve a «Todos»', () => {
    const on = toggleTramitesFilterChip(
      defaultTramitesListFilters,
      'needsAttention'
    )
    const off = toggleTramitesFilterChip(on, 'needsAttention')
    expect(off.all).toBe(true)
    expect(off.chips).toEqual([])
  })

  it('el contador de otro chip mantiene «Pendientes de ti» activo (dimensión propia)', () => {
    const filters = toggleTramitesFilterChip(
      defaultTramitesListFilters,
      'needsAttention'
    )
    // «En curso» no existe como chip visible, pero «Hecho» sí: con atención
    // activa el hecho no tiene cambios solicitados, así que cuenta 0 y no 1.
    expect(countTramitesForChip(items, 'done', filters)).toBe(0)
  })

  it('el total «Todos» con atención y varios estados no hereda el filtro', () => {
    let filters = toggleTramitesFilterChip(
      defaultTramitesListFilters,
      'needsAttention'
    )
    filters = toggleTramitesFilterChip(filters, 'inProgress')
    filters = toggleTramitesFilterChip(filters, 'done')
    expect(countTramitesForChip(items, 'all', filters)).toBe(3)
  })
})
