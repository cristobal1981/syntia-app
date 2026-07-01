'use client'

import { firmas } from '@/content/firmas'
import type { PendingSignaturesSnapshot } from '@/src/modules/firmas/domain/types'
import { FirmasRequestsList } from '@/src/modules/firmas/ui/firmas-requests-list'
import { PortalRefreshButton } from '@/src/modules/portal/ui/portal-refresh-button'

type FirmasPageViewProps = {
  data: PendingSignaturesSnapshot
}

export function FirmasPageView({ data }: FirmasPageViewProps) {
  return (
    <FirmasRequestsList
      requests={data.requests}
      headerAction={
        <PortalRefreshButton
          label={firmas.refreshButton}
          refreshingLabel={firmas.refreshing}
        />
      }
    />
  )
}

type FirmasStateViewProps = {
  title: string
  description: string
  variant?: 'default' | 'destructive'
}

export function FirmasStateView({
  title,
  description,
  variant = 'default',
}: FirmasStateViewProps) {
  const copy = firmas.list

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {copy.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <PortalRefreshButton
          label={firmas.refreshButton}
          refreshingLabel={firmas.refreshing}
        />
      </header>
      <div
        className={
          variant === 'destructive'
            ? 'portal-home-card rounded-xl border-destructive/30 px-6 py-10 text-center'
            : 'portal-home-card rounded-xl px-6 py-10 text-center'
        }
      >
        <h2 className="font-sans text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
