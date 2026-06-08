import type { IntegrationStatus } from '@/src/modules/portal/domain/types'

const statusLabel = {
  connected: 'Conectado',
  pending: 'Pendiente',
  error: 'Error',
} as const

const statusClass = {
  connected: 'bg-primary/15 text-primary',
  pending: 'bg-turquesa/15 text-turquesa',
  error: 'bg-destructive/15 text-destructive',
} as const

type IntegrationBadgesProps = {
  integrations: IntegrationStatus[]
}

export function IntegrationBadges({ integrations }: IntegrationBadgesProps) {
  return (
    <ul className="flex flex-wrap gap-3">
      {integrations.map((integration) => (
        <li
          key={integration.name}
          className="portal-home-card flex items-center gap-2 rounded-lg px-4 py-3"
        >
          <span className="font-sans font-medium text-foreground">
            {integration.name}
          </span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass[integration.status]}`}
          >
            {statusLabel[integration.status]}
          </span>
        </li>
      ))}
    </ul>
  )
}
