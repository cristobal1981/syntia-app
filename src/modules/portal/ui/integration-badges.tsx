import type { IntegrationStatus } from '@/src/modules/portal/domain/types'
import {
  integrationIcons,
  integrationStatusLabel,
  integrationStatusStyles,
} from '@/src/modules/portal/ui/integration-ui'
import { cn } from '@/lib/utils'

type IntegrationBadgesProps = {
  integrations: IntegrationStatus[]
  loading?: boolean
}

export function IntegrationBadges({
  integrations,
  loading = false,
}: IntegrationBadgesProps) {
  return (
    <ul
      className="flex flex-col gap-3 sm:flex-row sm:items-stretch"
      aria-busy={loading}
    >
      {integrations.map((integration) => {
        const styles = integrationStatusStyles[integration.status]
        const Icon = integrationIcons[integration.id]

        return (
          <li
            key={integration.id}
            className={cn(
              'portal-home-card flex min-w-0 flex-1 items-center gap-4 rounded-xl px-4 py-4 ring-1 ring-inset dark:ring-0 sm:px-5',
              styles.ring
            )}
          >
            <div
              className={cn(
                'flex size-11 shrink-0 items-center justify-center rounded-lg',
                styles.iconBg
              )}
            >
              <Icon className="size-5" aria-hidden />
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
              <span className="truncate font-sans font-medium text-foreground">
                {integration.name}
              </span>
              <span
                className={cn(
                  'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                  styles.badge
                )}
              >
                <span
                  className={cn('size-1.5 rounded-full', styles.dot)}
                  aria-hidden
                />
                {integrationStatusLabel[integration.status]}
              </span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
