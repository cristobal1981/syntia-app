'use client'

import { useState, useTransition } from 'react'
import { RefreshCw } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portal } from '@/content/portal'
import { refreshIntegrationsStatusAction } from '@/src/modules/portal/application/refresh-integrations-status'
import type { IntegrationStatus } from '@/src/modules/portal/domain/types'
import { IntegrationBadges } from '@/src/modules/portal/ui/integration-badges'

type IntegrationsPanelProps = {
  initialIntegrations: IntegrationStatus[]
  title?: string
  showRefresh?: boolean
}

export function IntegrationsPanel({
  initialIntegrations,
  title,
  showRefresh = true,
}: IntegrationsPanelProps) {
  const copy = portal.integrations
  const [integrations, setIntegrations] = useState(initialIntegrations)
  const [isPending, startTransition] = useTransition()

  function handleRefresh() {
    startTransition(async () => {
      const result = await refreshIntegrationsStatusAction()
      if (result.ok) {
        setIntegrations(result.integrations)
      }
    })
  }

  return (
    <div className="portal-home-card rounded-xl p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {title ? (
          <h2 className="font-sans text-base font-semibold text-foreground">
            {title}
          </h2>
        ) : (
          <span className="sr-only">{copy.title}</span>
        )}
        {showRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isPending}
            aria-busy={isPending}
          >
            <RefreshCw
              className={isPending ? 'animate-spin' : undefined}
              aria-hidden
            />
            {isPending ? copy.refreshingLabel : copy.refreshLabel}
          </Button>
        ) : null}
      </div>
      <IntegrationBadges
        integrations={integrations}
        loading={isPending}
        className="mt-3"
      />
    </div>
  )
}
