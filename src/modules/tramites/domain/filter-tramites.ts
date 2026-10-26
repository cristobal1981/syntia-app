import { tramites } from '@/content/tramites'
import {
  getTaskStateBadge,
  type TaskStateBadgeVariant,
} from '@/src/modules/tramites/domain/map-task-state'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'

export type TramitesFilterChip = 'tramite' | 'consulta' | 'needsAttention' | 'closed'

const TYPE_CHIPS = new Set<TramitesFilterChip>(['tramite', 'consulta'])

export type TramitesListFilters = {
  query: string
  chips: TramitesFilterChip[]
}

export const defaultTramitesListFilters: TramitesListFilters = {
  query: '',
  chips: [],
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

function matchesQuery(name: string, query: string): boolean {
  if (!query) return true
  return normalizeSearchText(name).includes(normalizeSearchText(query))
}

export function getTramiteListItemStateBadge(item: TramiteListItem): {
  label: string
  variant: TaskStateBadgeVariant
} {
  if (item.kind === 'consulta') {
    if (item.isClosed) {
      return {
        label: tramites.taskStates.done,
        variant: 'done',
      }
    }

    return {
      label: tramites.taskStates.inProgress,
      variant: 'inProgress',
    }
  }

  return getTaskStateBadge(item.state)
}

// «Requiere tu atención»: lo que está en ese estado, es decir, lo que el cliente
// tiene que atender. Es una dimensión propia y siempre es algo abierto.
function needsAttention(item: TramiteListItem): boolean {
  return !item.isClosed && getTramiteListItemStateBadge(item).variant === 'changesRequested'
}

/**
 * Tipo (trámites / consultas) se cruza en O entre sí y en Y con el resto.
 * Sin «Cerrados» solo se ven los abiertos; con él, solo los cerrados (hechos y cancelados).
 */
function matchesChips(item: TramiteListItem, chips: TramitesFilterChip[]): boolean {
  const typeChips = chips.filter((chip) => TYPE_CHIPS.has(chip))
  if (typeChips.length > 0 && !typeChips.some((chip) => item.kind === chip)) {
    return false
  }

  if (chips.includes('needsAttention')) return needsAttention(item)

  return chips.includes('closed') ? item.isClosed : !item.isClosed
}

export function filterTramitesList(
  items: TramiteListItem[],
  filters: TramitesListFilters
): TramiteListItem[] {
  return items.filter(
    (item) => matchesQuery(item.name, filters.query) && matchesChips(item, filters.chips)
  )
}

/**
 * «Requiere tu atención» y «Cerrados» son estados distintos y no se pueden dar a la vez:
 * activar uno quita el otro. Los de tipo se sustituyen en el contador, no en el filtro.
 */
const EXCLUSIVE_STATE_CHIPS: readonly TramitesFilterChip[] = ['needsAttention', 'closed']

function withChipActive(
  chips: TramitesFilterChip[],
  chip: TramitesFilterChip
): TramitesFilterChip[] {
  if (chips.includes(chip)) return chips
  const rest = EXCLUSIVE_STATE_CHIPS.includes(chip)
    ? chips.filter((value) => !EXCLUSIVE_STATE_CHIPS.includes(value))
    : chips
  return [...rest, chip]
}

/**
 * Cuántos saldrían al activar ese chip con el resto de filtros como están. Los de
 * tipo se sustituyen entre sí (no se suman al contador del otro).
 */
export function countTramitesForChip(
  items: TramiteListItem[],
  chip: TramitesFilterChip,
  filters: TramitesListFilters
): number {
  const others = filters.chips.filter((value) =>
    TYPE_CHIPS.has(chip) ? !TYPE_CHIPS.has(value) : value !== chip
  )
  const chips = withChipActive(others, chip)

  return items.filter(
    (item) => matchesQuery(item.name, filters.query) && matchesChips(item, chips)
  ).length
}

export function toggleTramitesFilterChip(
  filters: TramitesListFilters,
  chip: TramitesFilterChip
): TramitesListFilters {
  const chips = filters.chips.includes(chip)
    ? filters.chips.filter((value) => value !== chip)
    : withChipActive(filters.chips, chip)
  return { ...filters, chips }
}

export function isTramitesFilterChipActive(
  filters: TramitesListFilters,
  chip: TramitesFilterChip
): boolean {
  return filters.chips.includes(chip)
}

export function hasActiveTramitesFilters(filters: TramitesListFilters): boolean {
  return filters.query.trim().length > 0 || filters.chips.length > 0
}
