import Link from 'next/link'

import { portal } from '@/content/portal'
import type { OnboardingSolicitudStats } from '@/src/modules/onboarding/domain/onboarding-solicitud-stats'
import { cn } from '@/lib/utils'

type Segment = {
  key: 'received' | 'clicked' | 'failed'
  value: number
  label: string
  className: string
}

type SolicitudesChartCardProps = {
  title: string
  stats: OnboardingSolicitudStats
}

export function SolicitudesChartCard({ title, stats }: SolicitudesChartCardProps) {
  const copy = portal.home.solicitudesStats
  const total = stats.pendingReceived + stats.pendingClicked + stats.pendingFailed

  const segments: Segment[] = [
    {
      key: 'received',
      value: stats.pendingReceived,
      label: copy.received,
      className: 'bg-chart-ordinal-received',
    },
    {
      key: 'clicked',
      value: stats.pendingClicked,
      label: copy.clicked,
      className: 'bg-chart-ordinal-clicked',
    },
    {
      key: 'failed',
      value: stats.pendingFailed,
      label: copy.failed,
      className: 'bg-destructive',
    },
  ]
  const visibleSegments = segments.filter((segment) => segment.value > 0)

  return (
    <Link
      href="/solicitudes"
      className="portal-home-card portal-home-card-interactive block rounded-xl p-5 transition-colors hover:border-primary/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none dark:hover:border-transparent"
    >
      <h2 className="font-sans text-base font-semibold text-foreground">{title}</h2>

      <p className="mt-4 font-sans text-5xl font-semibold text-foreground">{total}</p>
      <p className="mt-1 text-sm text-muted-foreground">{copy.total}</p>

      {total === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{copy.empty}</p>
      ) : (
        <>
          <div className="mt-4 flex h-3 gap-0.5">
            {visibleSegments.map((segment, index) => (
              <div
                key={segment.key}
                title={`${segment.label}: ${segment.value}`}
                className={cn(
                  segment.className,
                  index === 0 && 'rounded-l-[4px]',
                  index === visibleSegments.length - 1 && 'rounded-r-[4px]'
                )}
                style={{ width: `${(segment.value / total) * 100}%` }}
              />
            ))}
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {segments.map((segment) => (
              <li
                key={segment.key}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span className={cn('size-1.5 rounded-full', segment.className)} aria-hidden />
                {segment.label}
                <span className="font-medium text-foreground">{segment.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Link>
  )
}
