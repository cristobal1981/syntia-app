import { tramites } from '@/content/tramites'
import {
  getTaskStateBadge,
  type TaskStateBadgeVariant,
} from '@/src/modules/tramites/domain/map-task-state'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'

export type TramitesFilterChip =
  | 'tramite'
  | 'consulta'
  | 'inProgress'
  | 'done'
  | 'canceled'
  | 'withDocuments'

const TYPE_CHIPS = new Set<TramitesFilterChip>(['tramite', 'consulta'])
const STATE_CHIPS = new Set<TramitesFilterChip>([
  'inProgress',
  'done',
  'canceled',
])
const DOCUMENTS_CHIP: TramitesFilterChip = 'withDocuments'

export type TramitesListFilters = {
  query: string
  includeClosed: boolean
  all: boolean
  chips: TramitesFilterChip[]
}

export const defaultTramitesListFilters: TramitesListFilters = {
  query: '',
  includeClosed: false,
  all: true,
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

function getItemStateChip(item: TramiteListItem): TramitesFilterChip | null {
  const badge = getTramiteListItemStateBadge(item)

  if (badge.variant === 'canceled' && item.kind === 'tramite') {
    return 'canceled'
  }

  if (badge.variant === 'done') return 'done'
  if (badge.variant === 'inProgress') return 'inProgress'

  return null
}

function matchesChip(item: TramiteListItem, chip: TramitesFilterChip): boolean {
  if (chip === DOCUMENTS_CHIP) {
    return item.attachmentCount > 0
  }

  if (chip === 'tramite' || chip === 'consulta') {
    return item.kind === chip
  }

  return getItemStateChip(item) === chip
}

function matchesFilters(
  item: TramiteListItem,
  filters: TramitesListFilters
): boolean {
  if (filters.all && filters.chips.length === 0) {
    if (!filters.includeClosed && item.isClosed) return false
    return true
  }

  const typeChips = filters.chips.filter((chip) => TYPE_CHIPS.has(chip))
  if (typeChips.length > 0 && !typeChips.some((chip) => matchesChip(item, chip))) {
    return false
  }

  const stateChips = filters.chips.filter((chip) => STATE_CHIPS.has(chip))
  if (stateChips.length > 0) {
    const stateChip = getItemStateChip(item)
    if (!stateChip || !stateChips.includes(stateChip)) return false
  }

  if (filters.chips.includes(DOCUMENTS_CHIP) && item.attachmentCount <= 0) {
    return false
  }

  if (stateChips.length > 0) {
    return true
  }

  if (!filters.includeClosed && item.isClosed) return false
  return true
}

export function filterTramitesList(
  items: TramiteListItem[],
  filters: TramitesListFilters
): TramiteListItem[] {
  return items.filter((item) => {
    if (!matchesQuery(item.name, filters.query)) return false
    return matchesFilters(item, filters)
  })
}

function getChipDimension(
  chip: TramitesFilterChip
): 'type' | 'state' | 'documents' {
  if (chip === DOCUMENTS_CHIP) return 'documents'
  return TYPE_CHIPS.has(chip) ? 'type' : 'state'
}

function buildFacetedCountFilters(
  current: TramitesListFilters,
  targetChip: TramitesFilterChip | 'all'
): TramitesListFilters {
  if (targetChip === 'all') {
    const typeChips = current.chips.filter((chip) => TYPE_CHIPS.has(chip))
    const stateChips = current.chips.filter((chip) => STATE_CHIPS.has(chip))
    const hasDocuments = current.chips.includes(DOCUMENTS_CHIP)

    // Varios estados a la vez (p. ej. En curso + Hecho): el total es la unión,
    // no el modo «Todos» por defecto que oculta cerrados sin chip de estado.
    if (
      stateChips.length > 1 &&
      typeChips.length === 0 &&
      !hasDocuments
    ) {
      return current
    }

    return {
      query: current.query,
      includeClosed: current.includeClosed,
      all: true,
      chips: [],
    }
  }

  const targetDimension = getChipDimension(targetChip)
  const otherChips = current.chips.filter(
    (chip) => getChipDimension(chip) !== targetDimension
  )

  return {
    query: current.query,
    includeClosed: current.includeClosed,
    all: false,
    chips: [...otherChips, targetChip],
  }
}

export function countTramitesForChip(
  items: TramiteListItem[],
  chip: TramitesFilterChip | 'all',
  filters: TramitesListFilters
): number {
  const preview = buildFacetedCountFilters(filters, chip)

  return items.filter((item) => {
    if (!matchesQuery(item.name, preview.query)) return false
    return matchesFilters(item, preview)
  }).length
}

function syncClosedState(filters: TramitesListFilters): TramitesListFilters {
  const hasDone = filters.chips.includes('done')
  const hasCanceled = filters.chips.includes('canceled')

  if (hasDone && hasCanceled) {
    return { ...filters, includeClosed: true }
  }

  return filters
}

export function toggleTramitesFilterChip(
  filters: TramitesListFilters,
  chip: TramitesFilterChip | 'all'
): TramitesListFilters {
  if (chip === 'all') {
    return {
      ...filters,
      all: true,
      chips: [],
    }
  }

  const chips = filters.chips.includes(chip)
    ? filters.chips.filter((value) => value !== chip)
    : [...filters.chips, chip]

  if (!chips.length) {
    return syncClosedState({
      ...filters,
      all: true,
      chips: [],
    })
  }

  let next: TramitesListFilters = {
    ...filters,
    all: false,
    chips,
  }

  if (!chips.includes('done') || !chips.includes('canceled')) {
    if (!filters.all) {
      next = { ...next, includeClosed: false }
    }
  }

  return syncClosedState(next)
}

export function isTramitesFilterChipActive(
  filters: TramitesListFilters,
  chip: TramitesFilterChip | 'all'
): boolean {
  if (chip === 'all') {
    return filters.all && filters.chips.length === 0
  }

  return !filters.all && filters.chips.includes(chip)
}

export function setTramitesIncludeClosed(
  filters: TramitesListFilters,
  includeClosed: boolean
): TramitesListFilters {
  if (includeClosed) {
    if (filters.all && filters.chips.length === 0) {
      return { ...filters, includeClosed: true }
    }

    const hasStateChip = filters.chips.some((chip) => STATE_CHIPS.has(chip))
    if (!hasStateChip) {
      return { ...filters, includeClosed: true }
    }

    const chips = new Set(filters.chips)
    chips.add('done')
    chips.add('canceled')

    return {
      ...filters,
      all: false,
      includeClosed: true,
      chips: [...chips],
    }
  }

  const chips = filters.chips.filter(
    (chip) => chip !== 'done' && chip !== 'canceled'
  )

  if (!chips.length) {
    return {
      ...filters,
      all: true,
      includeClosed: false,
      chips: [],
    }
  }

  return {
    ...filters,
    includeClosed: false,
    chips,
  }
}

export function hasActiveTramitesFilters(
  filters: TramitesListFilters
): boolean {
  return (
    filters.query.trim().length > 0 ||
    filters.includeClosed ||
    !filters.all ||
    filters.chips.length > 0
  )
}

export function supportsIncludeClosedCheckbox(
  filters: TramitesListFilters
): boolean {
  const stateChips = filters.chips.filter((chip) => STATE_CHIPS.has(chip))
  return filters.all || stateChips.length === 0
}
