import Link from 'next/link'

import { portal } from '@/content/portal'
import type { ClientDashboardSnapshot } from '@/src/modules/portal/application/get-client-dashboard-snapshot'

type ClientHomeStatsProps = {
  data: ClientDashboardSnapshot
  unreadCount?: number
}

type StatCardProps = {
  label: string
  value: number
  href?: string
}

function StatCard({ label, value, href }: StatCardProps) {
  const content = (
    <>
      <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </>
  )

  if (!href) {
    return (
      <div className="portal-home-card rounded-xl p-4 md:p-5">
        {content}
      </div>
    )
  }

  return (
    <Link
      href={href}
      className="portal-home-card rounded-xl p-4 transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none md:p-5"
    >
      {content}
    </Link>
  )
}

export function ClientHomeStats({ data, unreadCount = 0 }: ClientHomeStatsProps) {
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
          href="/tramites"
        />
        <StatCard
          label={copy.stats.obligacionesInProgress}
          value={data.obligacionesInProgress}
          href="/obligaciones"
        />
        <StatCard
          label={copy.stats.unreadMessages}
          value={unreadCount}
          href="/tramites"
        />
      </div>
    </section>
  )
}

export function ClientHomeStatsUnavailable() {
  return (
    <section
      className="portal-home-card rounded-xl px-5 py-4 text-sm text-muted-foreground"
      aria-live="polite"
    >
      {portal.home.client.statsUnavailable}
    </section>
  )
}
