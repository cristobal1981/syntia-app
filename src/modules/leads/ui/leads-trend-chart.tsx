import { leads as leadsCopy } from '@/content/leads'
import type { LeadTrendPoint } from '@/src/modules/leads/domain/types'

type LeadsTrendChartProps = {
  trend: LeadTrendPoint[]
}

export function LeadsTrendChart({ trend }: LeadsTrendChartProps) {
  const copy = leadsCopy.trend
  const max = Math.max(1, ...trend.map((point) => point.count))

  return (
    <div className="portal-home-card rounded-xl p-5">
      <h2 className="font-sans text-base font-semibold text-foreground">{copy.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>

      {trend.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{leadsCopy.emptyTitle}</p>
      ) : (
        <div className="mt-4 flex h-24 items-end gap-1" aria-hidden>
          {trend.map((point) => (
            <div
              key={point.periodKey}
              title={`${point.periodKey}: ${point.count}`}
              className="min-h-0.5 flex-1 rounded-t-sm bg-primary/70"
              style={{ height: `${(point.count / max) * 100}%` }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
