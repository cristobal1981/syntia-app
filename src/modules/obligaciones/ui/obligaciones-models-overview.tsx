'use client'

import { AppLink, appLinkPortalClassName } from '@/components/ui/app-link'
import { obligaciones } from '@/content/obligaciones'
import { cn } from '@/lib/utils'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'

type ObligacionesModelsOverviewProps = {
  models: string[]
  selectedModel: string | null
  onSelectModel: (modelLabel: string | null) => void
}

export function ObligacionesModelsOverview({
  models,
  selectedModel,
  onSelectModel,
}: ObligacionesModelsOverviewProps) {
  const copy = obligaciones.configOverview

  if (!models.length) {
    return null
  }

  return (
    <section
      aria-labelledby="obligaciones-config-heading"
      className="portal-home-card rounded-xl px-5 py-5 md:px-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2
            id="obligaciones-config-heading"
            className="font-sans text-base font-semibold text-foreground"
          >
            {copy.title}
          </h2>
          <p className="text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <AppLink
          href="/obligaciones/guia-modelos"
          className={cn('shrink-0 text-sm', appLinkPortalClassName)}
        >
          {copy.guideLink}
        </AppLink>
      </div>

      <div
        className="mt-4 flex flex-wrap gap-2"
        role="group"
        aria-label={copy.title}
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
    </section>
  )
}
