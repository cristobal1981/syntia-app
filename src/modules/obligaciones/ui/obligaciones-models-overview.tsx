'use client'

import { obligaciones } from '@/content/obligaciones'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'
import { ObligacionesSearchToolbar } from '@/src/modules/obligaciones/ui/obligaciones-search-toolbar'

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
    <section
      aria-label={copy.searchLabel}
      className="portal-home-card flex flex-col gap-4 rounded-xl p-4 md:p-5"
    >
      <ObligacionesSearchToolbar
        query={searchQuery}
        onQueryChange={onSearchQueryChange}
      />

      {models.length > 0 ? (
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
      ) : null}
    </section>
  )
}
