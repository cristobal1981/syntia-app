'use client'

import { X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { tramites } from '@/content/tramites'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'
import { PortalSearchToolbar } from '@/src/modules/portal/ui/portal-search-toolbar'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import {
  countTramitesForChip,
  defaultTramitesListFilters,
  hasActiveTramitesFilters,
  isTramitesFilterChipActive,
  toggleTramitesFilterChip,
  type TramitesFilterChip,
  type TramitesListFilters,
} from '@/src/modules/tramites/domain/filter-tramites'

type TramitesFiltersToolbarProps = {
  filters: TramitesListFilters
  onChange: (filters: TramitesListFilters) => void
  items: TramiteListItem[]
}

const typeChipOptions: { value: TramitesFilterChip; label: string }[] = [
  { value: 'tramite', label: tramites.filters.views.tramites },
  { value: 'consulta', label: tramites.filters.views.consultas },
]

function ChipGroup({
  label,
  options,
  filters,
  items,
  onChange,
}: {
  label: string
  options: { value: TramitesFilterChip; label: string }[]
  filters: TramitesListFilters
  items: TramiteListItem[]
  onChange: (filters: TramitesListFilters) => void
}) {
  return (
    <div
      className="contents sm:flex sm:flex-wrap sm:items-center sm:gap-1.5"
      role="group"
      aria-label={label}
    >
      {options.map((option) => {
        const count = countTramitesForChip(items, option.value, filters)
        const active = isTramitesFilterChipActive(filters, option.value)

        return (
          <PortalFilterChip
            key={option.value}
            label={option.label}
            count={count}
            active={active}
            onClick={() => onChange(toggleTramitesFilterChip(filters, option.value))}
          />
        )
      })}
    </div>
  )
}

export function TramitesFiltersToolbar({
  filters,
  onChange,
  items,
}: TramitesFiltersToolbarProps) {
  const hasActive = hasActiveTramitesFilters(filters)
  const attentionCount = countTramitesForChip(items, 'needsAttention', filters)
  const attentionActive = isTramitesFilterChipActive(filters, 'needsAttention')
  const closedCount = countTramitesForChip(items, 'closed', filters)
  const closedActive = isTramitesFilterChipActive(filters, 'closed')

  return (
    <PortalSearchToolbar
      searchId="tramites-search"
      searchLabel={tramites.filters.searchLabel}
      searchPlaceholder={tramites.filters.searchPlaceholder}
      query={filters.query}
      onQueryChange={(query) => onChange({ ...filters, query })}
      filters={
        // En móvil los chips fluyen en una sola tanda (sin separadores ni grupos
        // en filas propias); desde `sm` vuelven los grupos con su divisor.
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-x-4 sm:gap-y-2 sm:divide-x sm:divide-border">
          {/* Estados distintos: con uno activo no se ofrece el otro. */}
          {closedActive ? null : (
            <div className="contents sm:block sm:pr-4">
              <PortalFilterChip
                label={tramites.filters.views.needsAttention}
                count={attentionCount}
                active={attentionActive}
                onClick={() => onChange(toggleTramitesFilterChip(filters, 'needsAttention'))}
              />
            </div>
          )}

          <div className="contents sm:block sm:pr-4">
            <ChipGroup
              label={tramites.filters.typeLabel}
              options={typeChipOptions}
              filters={filters}
              items={items}
              onChange={onChange}
            />
          </div>

          <div className="contents sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:pl-1">
            {attentionActive ? null : (
              <PortalFilterChip
                label={tramites.filters.views.closed}
                count={closedCount}
                active={closedActive}
                onClick={() => onChange(toggleTramitesFilterChip(filters, 'closed'))}
              />
            )}

            {hasActive ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onChange(defaultTramitesListFilters)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" aria-hidden />
                {tramites.filters.clearFilters}
              </Button>
            ) : null}
          </div>
        </div>
      }
    />
  )
}
