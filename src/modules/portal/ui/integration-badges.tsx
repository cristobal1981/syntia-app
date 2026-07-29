import type { IntegrationStatus } from '@/src/modules/portal/domain/types'
import {
  integrationBrandIcons,
  integrationStatusLabel,
  integrationStatusStyles,
} from '@/src/modules/portal/ui/integration-ui'
import { BrandMark } from '@/src/modules/portal/ui/brand-mark'
import { cn } from '@/lib/utils'

type IntegrationBadgesProps = {
  integrations: IntegrationStatus[]
  loading?: boolean
  className?: string
}

export function IntegrationBadges({
  integrations,
  loading = false,
  className,
}: IntegrationBadgesProps) {
  return (
    <ul
      className={cn(
        'flex flex-col divide-y divide-border transition-opacity dark:divide-border/60',
        loading && 'opacity-60',
        className
      )}
      aria-busy={loading}
    >
      {integrations.map((integration) => {
        const styles = integrationStatusStyles[integration.status]
        const brand = integrationBrandIcons[integration.id]

        return (
          <li
            key={integration.id}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >
            <BrandMark
              path={brand.path}
              title={brand.title}
              className="size-6 shrink-0 text-icon-muted"
            />
            <span className="min-w-0 flex-1 truncate font-sans font-medium text-foreground">
              {integration.name}
            </span>
            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 text-xs font-medium',
                styles.text
              )}
            >
              <span className={cn('size-1.5 rounded-full', styles.dot)} aria-hidden />
              {integrationStatusLabel[integration.status]}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
