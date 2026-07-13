import Link from 'next/link'
import { ClipboardList, FileSignature, Scale, type LucideIcon } from 'lucide-react'

import { portal } from '@/content/portal'
import type { ClientDashboardSnapshot } from '@/src/modules/portal/application/get-client-dashboard-snapshot'
import type { ClientDashboardSnapshotResult } from '@/src/modules/portal/application/get-client-dashboard-snapshot'

type ClientHomeStatsProps = {
  data: ClientDashboardSnapshot
}

type StatCardProps = {
  label: string
  value: number
  icon: LucideIcon
  href?: string
}

function StatCard({ label, value, icon: Icon, href }: StatCardProps) {
  const inner = (
    <div className="flex items-start gap-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="size-5 text-primary" aria-hidden />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  )

  if (!href) {
    return (
      <div className="portal-home-card rounded-xl p-4 md:p-5">
        {inner}
      </div>
    )
  }

  const className =
    'portal-home-card portal-home-card-interactive rounded-xl p-4 transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:hover:border-transparent md:p-5'

  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  )
}

export function ClientHomeStats({ data }: ClientHomeStatsProps) {
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
          label={copy.stats.activeTramitesAndConsultas}
          value={data.activeTramitesAndConsultas}
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
          label={copy.stats.pendingSignatures}
          value={data.pendingSignatures}
          icon={FileSignature}
          href="/firmas"
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
