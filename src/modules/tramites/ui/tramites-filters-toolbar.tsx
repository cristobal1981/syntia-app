'use client'

import { Info, Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { tramites } from '@/content/tramites'
import { PortalActionTooltip } from '@/src/modules/portal/ui/portal-action-tooltip'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import {
  countTramitesForChip,
  defaultTramitesListFilters,
  hasActiveTramitesFilters,
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

const typeChipOptions: { value: TramitesFilterChip; label: string }[] = [
  { value: 'tramite', label: tramites.filters.views.tramites },
  { value: 'consulta', label: tramites.filters.views.consultas },
]

const stateChipOptions: { value: TramitesFilterChip; label: string }[] = [
  { value: 'done', label: tramites.filters.views.done },
  { value: 'canceled', label: tramites.filters.views.canceled },
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
      className="flex flex-wrap items-center gap-1.5"
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
  const showIncludeClosed = supportsIncludeClosedCheckbox(filters)
  const hasActive = hasActiveTramitesFilters(filters)
  const documentsCount = countTramitesForChip(items, 'withDocuments', filters)
  const documentsActive = isTramitesFilterChipActive(filters, 'withDocuments')

  return (
    <div className="portal-home-card flex flex-col gap-3 rounded-xl p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <label htmlFor="tramites-search" className="sr-only">
            {tramites.filters.searchLabel}
          </label>
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
            className="h-10 bg-input pl-9"
            onChange={(event) => {
              onChange({ ...filters, query: event.target.value })
            }}
          />
        </div>

        {showIncludeClosed ? (
          <label className="ml-auto flex items-center gap-1.5 text-sm whitespace-nowrap text-foreground">
            <input
              type="checkbox"
              checked={filters.includeClosed}
              onChange={(event) => {
                onChange(setTramitesIncludeClosed(filters, event.target.checked))
              }}
              className="size-4 rounded border border-border accent-primary"
            />
            {tramites.filters.includeClosed}
            <PortalActionTooltip content={tramites.filters.includeClosedHint}>
              <span
                tabIndex={0}
                role="img"
                aria-label={tramites.filters.includeClosedHint}
                className="inline-flex"
              >
                <Info className="size-3.5 text-muted-foreground" aria-hidden />
              </span>
            </PortalActionTooltip>
          </label>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 divide-x divide-border">
        <div className="pr-4">
          <ChipGroup
            label={tramites.filters.typeLabel}
            options={typeChipOptions}
            filters={filters}
            items={items}
            onChange={onChange}
          />
        </div>

        <div className="pr-4 pl-1">
          <ChipGroup
            label={tramites.filters.stateLabel}
            options={stateChipOptions}
            filters={filters}
            items={items}
            onChange={onChange}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 pl-1">
          <PortalFilterChip
            label={tramites.filters.views.withDocuments}
            count={documentsCount}
            active={documentsActive}
            onClick={() => onChange(toggleTramitesFilterChip(filters, 'withDocuments'))}
          />

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
    </div>
  )
}
