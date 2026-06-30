'use client'

import { firmas } from '@/content/firmas'
import type { PendingSignaturesSnapshot } from '@/src/modules/firmas/domain/types'
import { PendingSignatureCard } from '@/src/modules/firmas/ui/pending-signature-card'
import { PortalRefreshButton } from '@/src/modules/portal/ui/portal-refresh-button'

type FirmasPageViewProps = {
  data: PendingSignaturesSnapshot
}

export function FirmasPageView({ data }: FirmasPageViewProps) {
  const count = data.requests.length

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
              {firmas.title}
            </h1>
            {count > 0 ? (
              <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-sm font-medium text-primary">
                {firmas.pendingCount.replace('{count}', String(count))}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {firmas.description}
          </p>
        </div>
        <PortalRefreshButton
          label={firmas.refreshButton}
          refreshingLabel={firmas.refreshing}
        />
      </header>

      {count > 0 ? (
        <div className="flex flex-col gap-3">
          {data.requests.map((request) => (
            <PendingSignatureCard key={request.id} request={request} />
          ))}
        </div>
      ) : (
        <div className="portal-home-card rounded-xl px-6 py-10 text-center">
          <h2 className="font-sans text-base font-semibold text-foreground">
            {firmas.emptyTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {firmas.emptyDescription}
          </p>
        </div>
      )}
    </div>
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
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {firmas.title}
        </h1>
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
