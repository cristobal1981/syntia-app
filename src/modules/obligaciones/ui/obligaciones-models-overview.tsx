'use client'

import Link from 'next/link'

import { obligaciones } from '@/content/obligaciones'
import { cn } from '@/lib/utils'

type ObligacionesModelsOverviewProps = {
  models: string[]
  activeQuery: string
  onSelectModel: (modelLabel: string) => void
}

export function ObligacionesModelsOverview({
  models,
  activeQuery,
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
        <Link
          href="/obligaciones/guia-modelos"
          className="shrink-0 text-sm font-medium text-agua underline underline-offset-4 decoration-agua/50 hover:decoration-agua dark:text-turquesa dark:decoration-turquesa/50 dark:hover:decoration-turquesa focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {copy.guideLink}
        </Link>
      </div>

      <ul className="mt-4 flex flex-wrap gap-2">
        {models.map((modelLabel) => {
          const isActive =
            activeQuery.trim().toLowerCase() === modelLabel.toLowerCase()

          return (
            <li key={modelLabel}>
              <button
                type="button"
                onClick={() => onSelectModel(isActive ? '' : modelLabel)}
                aria-pressed={isActive}
                className={cn(
                  'inline-flex min-h-9 items-center rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground hover:bg-muted/80'
                )}
              >
                {modelLabel}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
