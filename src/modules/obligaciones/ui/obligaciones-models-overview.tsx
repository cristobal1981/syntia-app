'use client'

import { obligaciones } from '@/content/obligaciones'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'
import { PortalSearchToolbar } from '@/src/modules/portal/ui/portal-search-toolbar'

type ObligacionesModelsOverviewProps = {
  models: string[]
  selectedModel: string | null
  onSelectModel: (modelLabel: string | null) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
}

export function ObligacionesModelsOverview({
  models,
  selectedModel,
  onSelectModel,
  searchQuery,
  onSearchQueryChange,
}: ObligacionesModelsOverviewProps) {
  const copy = obligaciones.filters

  return (
    <PortalSearchToolbar
      searchId="obligaciones-search"
      searchLabel={copy.searchLabel}
      searchPlaceholder={copy.searchPlaceholder}
      query={searchQuery}
      onQueryChange={onSearchQueryChange}
      filters={
        models.length > 0 ? (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label={copy.chipGroupLabel}
          >
            {models.map((modelLabel) => {
              const isActive =
                selectedModel?.trim().toLowerCase() === modelLabel.toLowerCase()

              return (
                <PortalFilterChip
                  key={modelLabel}
                  label={modelLabel}
                  active={isActive}
                  onClick={() => {
                    onSelectModel(isActive ? null : modelLabel)
                  }}
                />
              )
            })}
          </div>
        ) : undefined
      }
    />
  )
}
