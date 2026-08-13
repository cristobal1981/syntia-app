import Link from 'next/link'
import {
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSignature,
  Scale,
  type LucideIcon,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { portal } from '@/content/portal'
import type {
  ClientDashboardSnapshot,
  ClientDashboardSnapshotResult,
} from '@/src/modules/portal/application/get-client-dashboard-snapshot'
import {
  resolveClientHomeHeadlineCase,
  type ClientHomeHeadlineCase,
} from '@/src/modules/portal/domain/resolve-client-home-headline'

type ClientHomeStatsProps = {
  data: ClientDashboardSnapshot
}

function formatDeadline(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long' }).format(date)
}

function buildHeadlineText(headlineCase: ClientHomeHeadlineCase): string {
  const copy = portal.home.client.headline

  switch (headlineCase.kind) {
    case 'deadline':
      return copy.deadlineOne
        .replace('{name}', headlineCase.name)
        .replace('{date}', formatDeadline(headlineCase.deadline))
    case 'signatures':
      return headlineCase.count === 1
        ? copy.signaturesOne
        : copy.signaturesMany.replace('{count}', String(headlineCase.count))
    case 'obligaciones':
      return headlineCase.count === 1
        ? copy.obligacionesOne
        : copy.obligacionesMany.replace('{count}', String(headlineCase.count))
    case 'tramites':
      return headlineCase.count === 1
        ? copy.tramitesOne
        : copy.tramitesMany.replace('{count}', String(headlineCase.count))
    case 'allClear':
      return copy.allClear
  }
}

const HEADLINE_ICON: Record<ClientHomeHeadlineCase['kind'], LucideIcon> = {
  deadline: Scale,
  obligaciones: Scale,
  signatures: FileSignature,
  tramites: ClipboardList,
  allClear: CheckCircle2,
}

type SecondaryMetric = 'tramites' | 'obligaciones' | 'firmas'

/** Qué métrica ya quedó reflejada en el titular, para no repetirla abajo. */
function metricCoveredByHeadline(headlineCase: ClientHomeHeadlineCase): SecondaryMetric | null {
  switch (headlineCase.kind) {
    case 'deadline':
    case 'obligaciones':
      return 'obligaciones'
    case 'signatures':
      return 'firmas'
    case 'tramites':
      return 'tramites'
    case 'allClear':
      return null
  }
}

export function ClientHomeStats({ data }: ClientHomeStatsProps) {
  const copy = portal.home.client
  const headlineCase = resolveClientHomeHeadlineCase(data)
  const headlineText = buildHeadlineText(headlineCase)
  const covered = metricCoveredByHeadline(headlineCase)

  const secondaryStats: { key: SecondaryMetric; label: string; value: number; href: string }[] =
    headlineCase.kind === 'allClear'
      ? []
      : (
          [
            {
              key: 'tramites',
              label: copy.stats.activeTramitesAndConsultas,
              value: data.activeTramitesAndConsultas,
              href: '/tramites',
            },
            {
              key: 'obligaciones',
              label: copy.stats.obligacionesInProgress,
              value: data.obligacionesInProgress,
              href: '/obligaciones',
            },
            {
              key: 'firmas',
              label: copy.stats.pendingSignatures,
              value: data.pendingSignatures,
              href: '/firmas',
            },
          ] as const
        ).filter((stat) => stat.key !== covered)

  const Icon = HEADLINE_ICON[headlineCase.kind]
  const isClickable = headlineCase.kind !== 'allClear'

  const iconBadge = (
    <span
      className={cn(
        'flex size-9 shrink-0 items-center justify-center rounded-lg',
        isClickable ? 'bg-primary/10' : 'bg-muted'
      )}
    >
      <Icon className={cn('size-4', isClickable ? 'text-primary' : 'text-muted-foreground')} aria-hidden />
    </span>
  )

  const headlineTextEl = (
    <span className="font-sans text-xl font-medium text-foreground md:text-2xl">
      {headlineText}
    </span>
  )

  return (
    <section aria-labelledby="client-home-stats" className="flex flex-col gap-3">
      <h2 id="client-home-stats" className="sr-only">
        {copy.statsTitle}
      </h2>
      {isClickable ? (
        <Link
          href={headlineCase.href}
          className="group -mx-3 -my-2 flex w-fit items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
        >
          {iconBadge}
          <span className="flex items-center gap-1.5">
            {headlineTextEl}
            <ChevronRight
              className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </Link>
      ) : (
        <div className="flex items-center gap-3">
          {iconBadge}
          {headlineTextEl}
        </div>
      )}
      {secondaryStats.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {secondaryStats.map((stat) => (
            <Link
              key={stat.key}
              href={stat.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {stat.value} {stat.label.toLowerCase()}
            </Link>
          ))}
        </div>
      ) : null}
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
