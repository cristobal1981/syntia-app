'use client'

import { useMemo, useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portal } from '@/content/portal'
import { refreshIntegrationsStatusAction } from '@/src/modules/portal/application/refresh-integrations-status'
import type {
  IntegrationConnectionStatus,
  IntegrationStatus,
} from '@/src/modules/portal/domain/types'
import {
  integrationIcons,
  integrationStatusLabel,
  integrationStatusStyles,
} from '@/src/modules/portal/ui/integration-ui'
import { cn } from '@/lib/utils'

type IntegrationsPageViewProps = {
  initialIntegrations: IntegrationStatus[]
}

export function IntegrationsPageView({
  initialIntegrations,
}: IntegrationsPageViewProps) {
  const copy = portal.integrations
  const [integrations, setIntegrations] = useState(initialIntegrations)
  const [isPending, startTransition] = useTransition()

  const summary = useMemo(() => {
    return integrations.reduce(
      (acc, item) => {
        acc[item.status] += 1
        return acc
      },
      { connected: 0, pending: 0, error: 0 }
    )
  }, [integrations])

  function handleRefresh() {
    startTransition(async () => {
      const result = await refreshIntegrationsStatusAction()
      if (result.ok) {
        setIntegrations(result.integrations)
      }
    })
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-medium tracking-wide text-primary uppercase">
              Administración
            </p>
            <h1 className="mt-2 font-sans text-2xl font-semibold text-foreground md:text-3xl">
              {copy.title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {copy.description}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleRefresh}
            disabled={isPending}
            aria-busy={isPending}
            className="shrink-0 self-start md:self-auto"
          >
            <RefreshCw
              className={isPending ? 'animate-spin' : undefined}
              aria-hidden
            />
            {isPending ? copy.refreshingLabel : copy.refreshLabel}
          </Button>
        </div>

        <ul
          className="flex flex-wrap gap-3"
          aria-label="Resumen de integraciones"
        >
          <SummaryPill
            count={summary.connected}
            label={copy.summaryConnected}
            tone="connected"
          />
          <SummaryPill
            count={summary.pending}
            label={copy.summaryPending}
            tone="pending"
          />
          <SummaryPill
            count={summary.error}
            label={copy.summaryError}
            tone="error"
          />
        </ul>
      </header>

      <ul
        className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
        aria-busy={isPending}
      >
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </ul>
    </div>
  )
}

function SummaryPill({
  count,
  label,
  tone,
}: {
  count: number
  label: string
  tone: IntegrationConnectionStatus
}) {
  const styles = integrationStatusStyles[tone]

  return (
    <li
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm',
        styles.badge
      )}
    >
      <span className="font-sans text-lg font-semibold tabular-nums">{count}</span>
      <span>{label}</span>
    </li>
  )
}

function IntegrationCard({ integration }: { integration: IntegrationStatus }) {
  const copy = portal.integrations
  const itemCopy = copy.items[integration.id]
  const styles = integrationStatusStyles[integration.status]
  const Icon = integrationIcons[integration.id]

  return (
    <li
      className={cn(
        'portal-home-card flex h-full flex-col rounded-2xl p-5 ring-1 ring-inset',
        styles.ring
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          className={cn(
            'flex size-12 shrink-0 items-center justify-center rounded-xl',
            styles.iconBg
          )}
        >
          <Icon className="size-6" aria-hidden />
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium',
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

      <h2 className="mt-4 font-sans text-lg font-semibold text-foreground">
        {integration.name}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {itemCopy.description}
      </p>
    </li>
  )
}
