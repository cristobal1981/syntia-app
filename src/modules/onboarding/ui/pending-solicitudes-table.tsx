'use client'

import { Loader2 } from 'lucide-react'

import { solicitudes } from '@/content/solicitudes'
import { cn } from '@/lib/utils'
import type { OnboardingSolicitudRow } from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { formatOnboardingDateNumeric } from '@/src/modules/onboarding/ui/format-onboarding-date'
import { OnboardingSolicitudRowActions } from '@/src/modules/onboarding/ui/onboarding-solicitud-row-actions'
import { OnboardingTokenSecret } from '@/src/modules/onboarding/ui/onboarding-token-secret'
import { useSolicitudRowNavigation } from '@/src/modules/onboarding/ui/use-solicitud-row-navigation'

export function PendingSolicitudesTable({
  rows,
  onUpdated,
}: {
  rows: OnboardingSolicitudRow[]
  onUpdated: (rows: OnboardingSolicitudRow[]) => void
}) {
  const copy = solicitudes.list
  const { navigatingToken, handleRowOpen } = useSolicitudRowNavigation()

  if (rows.length === 0) {
    return (
      <div className="portal-home-card rounded-xl px-5 py-10 text-center">
        <p className="font-sans text-base font-medium text-foreground">
          {copy.emptyPendingTitle}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {copy.emptyPendingDescription}
        </p>
      </div>
    )
  }

  return (
    <div className="portal-home-card overflow-x-auto rounded-xl">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border dark:border-border/50">
            {Object.entries(copy.columns)
              .filter(([key]) => key !== 'status')
              .map(([key, header]) => (
                <th
                  key={key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 font-sans font-medium text-muted-foreground',
                    key === 'actions' && 'text-right'
                  )}
                >
                  {header}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isNavigating = navigatingToken === row.token
            return (
              <tr
                key={row.token}
                onClick={() => handleRowOpen(row.token)}
                aria-busy={isNavigating}
                className={cn(
                  'cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/40 dark:border-border/50',
                  isNavigating && 'bg-muted/40',
                  navigatingToken && !isNavigating && 'pointer-events-none opacity-50'
                )}
              >
                <td className="max-w-[160px] truncate px-4 py-3 text-foreground sm:max-w-[220px]">
                  <span className="inline-flex items-center gap-2">
                    {row.recipientName ?? copy.unknownClient}
                    {isNavigating ? (
                      <Loader2
                        className="size-3.5 shrink-0 animate-spin text-muted-foreground"
                        aria-hidden
                      />
                    ) : null}
                  </span>
                </td>
                <td
                  className="max-w-[140px] truncate px-4 py-3 text-muted-foreground sm:max-w-[240px]"
                  title={row.recipientEmail ?? undefined}
                >
                  {row.recipientEmail ?? '—'}
                </td>
                <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                  <OnboardingTokenSecret
                    token={row.token}
                    className="min-w-0 sm:min-w-[12rem]"
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {formatOnboardingDateNumeric(row.expiresAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <OnboardingSolicitudRowActions row={row} onUpdated={onUpdated} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
