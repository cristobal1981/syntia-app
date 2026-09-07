import { leads as leadsCopy } from '@/content/leads'
import type { SegmentBreakdown, SegmentKey } from '@/src/modules/leads/domain/types'
import { formatPct } from '@/src/modules/leads/ui/lead-format'

type LeadsSegmentBreakdownProps<T extends string> = {
  title: string
  entries: SegmentBreakdown<T>[]
  labelFor: (key: SegmentKey<T>) => string
}

export function LeadsSegmentBreakdown<T extends string>({
  title,
  entries,
  labelFor,
}: LeadsSegmentBreakdownProps<T>) {
  const copy = leadsCopy.segments

  if (entries.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="font-sans text-sm font-semibold text-foreground">{title}</h3>
      <ul className="flex flex-col gap-2.5">
        {entries.map((entry) => (
          <li key={entry.key}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-foreground">
                {entry.key === 'sin_dato' ? copy.sinDato : labelFor(entry.key)}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {entry.totalLeads} · {formatPct(entry.conversionRatePct)} {copy.conversionSuffix}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${entry.conversionRatePct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
