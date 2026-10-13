'use client'

import { useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'

import { Checkbox } from '@/components/ui/checkbox'
import { solicitudes } from '@/content/solicitudes'
import { cn } from '@/lib/utils'
import type { OnboardingSolicitudRow } from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { formatOnboardingDateNumeric } from '@/src/modules/onboarding/ui/format-onboarding-date'
import { OnboardingSolicitudRowActions } from '@/src/modules/onboarding/ui/onboarding-solicitud-row-actions'
import { OnboardingTokenSecret } from '@/src/modules/onboarding/ui/onboarding-token-secret'
import { statusClassName, statusLabel } from '@/src/modules/onboarding/ui/onboarding-status-badge'
import { useSolicitudRowNavigation } from '@/src/modules/onboarding/ui/use-solicitud-row-navigation'
import { PortalSearchToolbar } from '@/src/modules/portal/ui/portal-search-toolbar'

function ClosedSolicitudesFlatTable({
  rows,
  navigatingToken,
  onRowOpen,
  onUpdated,
}: {
  rows: OnboardingSolicitudRow[]
  navigatingToken: string | null
  onRowOpen: (token: string) => void
  onUpdated: (rows: OnboardingSolicitudRow[]) => void
}) {
  const copy = solicitudes.list

  return (
    <div className="portal-home-card overflow-x-auto rounded-xl">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border dark:border-border/50">
            {Object.entries(copy.columns).map(([key, header]) => (
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
                onClick={() => onRowOpen(row.token)}
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
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                      statusClassName(row.status)
                    )}
                  >
                    {statusLabel(row.status)}
                  </span>
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

type ClosedSolicitudGroup = {
  key: string
  label: string
  email: string | null
  rows: OnboardingSolicitudRow[]
}

export function ClosedSolicitudesTable({
  rows,
  onUpdated,
}: {
  rows: OnboardingSolicitudRow[]
  onUpdated: (rows: OnboardingSolicitudRow[]) => void
}) {
  const copy = solicitudes.list
  const { navigatingToken, handleRowOpen } = useSolicitudRowNavigation()
  const [search, setSearch] = useState('')
  const [groupByClient, setGroupByClient] = useState(false)

  const searchedRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) => {
      const haystack = `${row.recipientName ?? ''} ${row.recipientEmail ?? ''}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [rows, search])

  const groups = useMemo<ClosedSolicitudGroup[]>(() => {
    const byKey = new Map<string, ClosedSolicitudGroup>()
    for (const row of searchedRows) {
      const key = (row.recipientEmail ?? row.recipientName ?? '—').toLowerCase()
      const existing = byKey.get(key)
      if (existing) {
        existing.rows.push(row)
        continue
      }
      byKey.set(key, {
        key,
        label: row.recipientName ?? row.recipientEmail ?? copy.unknownClient,
        email: row.recipientEmail,
        rows: [row],
      })
    }
    return Array.from(byKey.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'))
  }, [searchedRows, copy.unknownClient])

  if (rows.length === 0) {
    return (
      <div className="portal-home-card rounded-xl px-5 py-10 text-center">
        <p className="font-sans text-base font-medium text-foreground">
          {copy.emptyClosedTitle}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {copy.emptyClosedDescription}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <PortalSearchToolbar
        searchId="solicitudes-closed-search"
        searchLabel={copy.searchLabel}
        searchPlaceholder={copy.searchPlaceholder}
        query={search}
        onQueryChange={setSearch}
        clearLabel={copy.searchClear}
        trailing={
          <label className="ml-auto flex items-center gap-1.5 text-sm whitespace-nowrap text-foreground">
            <Checkbox checked={groupByClient} onCheckedChange={setGroupByClient} />
            {copy.groupByClientLabel}
          </label>
        }
      />

      {searchedRows.length === 0 ? (
        <div className="portal-home-card rounded-xl px-5 py-10 text-center">
          <p className="font-sans text-base font-medium text-foreground">
            {copy.noMatchesTitle}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {copy.noMatchesDescription}
          </p>
        </div>
      ) : !groupByClient ? (
        <ClosedSolicitudesFlatTable
          rows={searchedRows}
          navigatingToken={navigatingToken}
          onRowOpen={handleRowOpen}
          onUpdated={onUpdated}
        />
      ) : (
        groups.map((group) => (
          <div key={group.key} className="portal-home-card overflow-hidden rounded-xl">
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 dark:border-border/50">
              <div className="min-w-0">
                <p className="truncate font-sans text-sm font-medium text-foreground">
                  {group.label}
                </p>
                {group.email ? (
                  <p className="truncate text-xs text-muted-foreground">{group.email}</p>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {group.rows.length}
              </span>
            </div>
            <table className="w-full min-w-[520px] text-left text-sm">
              <tbody>
                {group.rows.map((row) => {
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
                      <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                        <OnboardingTokenSecret
                          token={row.token}
                          className="min-w-0 sm:min-w-[12rem]"
                        />
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            'inline-flex rounded-full px-2 py-0.5 text-xs font-medium',
                            statusClassName(row.status)
                          )}
                        >
                          {statusLabel(row.status)}
                        </span>
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
        ))
      )}
    </div>
  )
}
