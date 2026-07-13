'use client'

import { Search } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { tramites } from '@/content/tramites'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import {
  countTramitesForChip,
  isTramitesFilterChipActive,
  setTramitesIncludeClosed,
  supportsIncludeClosedCheckbox,
  toggleTramitesFilterChip,
  type TramitesFilterChip,
  type TramitesListFilters,
} from '@/src/modules/tramites/domain/filter-tramites'

type TramitesFiltersToolbarProps = {
  filters: TramitesListFilters
  onChange: (filters: TramitesListFilters) => void
  items: TramiteListItem[]
}

const chipOptions: {
  value: TramitesFilterChip | 'all'
  label: string
}[] = [
  { value: 'all', label: tramites.filters.views.all },
  { value: 'tramite', label: tramites.filters.views.tramites },
  { value: 'consulta', label: tramites.filters.views.consultas },
  { value: 'inProgress', label: tramites.filters.views.inProgress },
  { value: 'done', label: tramites.filters.views.done },
  { value: 'canceled', label: tramites.filters.views.canceled },
  { value: 'withDocuments', label: tramites.filters.views.withDocuments },
]

export function TramitesFiltersToolbar({
  filters,
  onChange,
  items,
}: TramitesFiltersToolbarProps) {
  const showIncludeClosed = supportsIncludeClosedCheckbox(filters)

  return (
    <div className="portal-home-card flex flex-col gap-4 rounded-xl p-4 md:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="tramites-search" className="sr-only">
            {tramites.filters.searchLabel}
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="tramites-search"
              type="search"
              name="tramites-search"
              value={filters.query}
              placeholder={tramites.filters.searchPlaceholder}
              autoComplete="off"
              spellCheck={false}
              className="bg-input pl-9"
              onChange={(event) => {
                onChange({ ...filters, query: event.target.value })
              }}
            />
          </div>
        </div>

        {showIncludeClosed ? (
          <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={filters.includeClosed}
              onChange={(event) => {
                onChange(
                  setTramitesIncludeClosed(filters, event.target.checked)
                )
              }}
              className="size-4 rounded border border-border accent-primary"
            />
            {tramites.filters.includeClosed}
          </label>
        ) : null}
      </div>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label={tramites.filters.views.label}
      >
        {chipOptions.map((option) => {
          const count = countTramitesForChip(items, option.value, filters)
          const active = isTramitesFilterChipActive(filters, option.value)

          return (
            <PortalFilterChip
              key={option.value}
              label={option.label}
              count={count}
              active={active}
              onClick={() => {
                onChange(toggleTramitesFilterChip(filters, option.value))
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
