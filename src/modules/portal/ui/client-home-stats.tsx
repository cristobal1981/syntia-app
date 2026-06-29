import Link from 'next/link'
import { ClipboardList, MessageSquare, Scale, type LucideIcon } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { portal } from '@/content/portal'
import type { ClientDashboardSnapshot } from '@/src/modules/portal/application/get-client-dashboard-snapshot'
import type { ClientDashboardSnapshotResult } from '@/src/modules/portal/application/get-client-dashboard-snapshot'

type ClientHomeStatsProps = {
  data: ClientDashboardSnapshot
  unreadCount?: number
  notificationsLoading?: boolean
}

type StatCardProps = {
  label: string
  value: number
  icon: LucideIcon
  href?: string
  loading?: boolean
}

function StatCard({ label, value, icon: Icon, href, loading = false }: StatCardProps) {
  const inner = (
    <div className="flex items-start gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-5 text-primary" aria-hidden />
      </div>
      <div className="min-w-0">
        {loading ? (
          <>
            <Skeleton className="h-8 w-10" aria-hidden />
            <span className="sr-only">{portal.home.client.unreadLoading}</span>
          </>
        ) : (
          <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )

  if (!href) {
    return (
      <div
        className="portal-home-card rounded-xl p-4 md:p-5"
        aria-busy={loading || undefined}
      >
        {inner}
      </div>
    )
  }

  const className =
    'portal-home-card rounded-xl p-4 transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:p-5'

  if (loading) {
    return (
      <div className={className} aria-busy="true">
        {inner}
      </div>
    )
  }

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  )
}

export function ClientHomeStats({
  data,
  unreadCount = 0,
  notificationsLoading = false,
}: ClientHomeStatsProps) {
  const copy = portal.home.client

  return (
    <section aria-labelledby="client-home-stats">
      <h2
        id="client-home-stats"
        className="mb-4 font-sans text-lg font-semibold text-foreground"
      >
        {copy.statsTitle}
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={copy.stats.activeProcedures}
          value={data.activeTramites}
          icon={ClipboardList}
          href="/tramites"
        />
        <StatCard
          label={copy.stats.obligacionesInProgress}
          value={data.obligacionesInProgress}
          icon={Scale}
          href="/obligaciones"
        />
        <StatCard
          label={copy.stats.unreadMessages}
          value={unreadCount}
          icon={MessageSquare}
          href="/tramites"
          loading={notificationsLoading}
        />
      </div>
    </section>
  )
}

export function ClientHomeStatsUnavailable({
  error = null,
}: {
  error?: Extract<ClientDashboardSnapshotResult, { ok: false }>['error'] | null
}) {
  const copy = portal.home.client
  const message =
    error === 'odoo_rate_limited' ? copy.statsRateLimited : copy.statsUnavailable

  return (
    <section
      className="portal-home-card rounded-xl px-5 py-4 text-sm text-muted-foreground"
      aria-live="polite"
    >
      {message}
    </section>
  )
}
