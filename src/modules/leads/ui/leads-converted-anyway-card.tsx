import { leads as leadsCopy } from '@/content/leads'
import type { ConvertedAnywayEntry } from '@/src/modules/leads/domain/types'
import { formatPct } from '@/src/modules/leads/ui/lead-format'
import { ESTADO_SOLID_CLASS } from '@/src/modules/leads/ui/lead-estado-colors'
import { cn } from '@/lib/utils'

type LeadsConvertedAnywayCardProps = {
  entries: ConvertedAnywayEntry[]
}

export function LeadsConvertedAnywayCard({ entries }: LeadsConvertedAnywayCardProps) {
  const copy = leadsCopy.convertedAnyway
  const visible = entries.filter((entry) => entry.totalLeads > 0)

  return (
    <div className="portal-home-card rounded-xl p-5">
      <h2 className="font-sans text-base font-semibold text-foreground">{copy.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>

      {visible.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{copy.noLeads}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {visible.map((entry) => (
            <li key={entry.estado}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <span
                    className={cn('size-1.5 rounded-full', ESTADO_SOLID_CLASS[entry.estado])}
                    aria-hidden
                  />
                  {leadsCopy.estados[entry.estado]}
                </span>
                <span className="text-muted-foreground">
                  {copy.convertedOf
                    .replace('{converted}', String(entry.convertedCount))
                    .replace('{total}', String(entry.totalLeads))}
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn('h-full rounded-full', ESTADO_SOLID_CLASS[entry.estado])}
                  style={{ width: `${entry.convertedPct}%` }}
                  title={formatPct(entry.convertedPct)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
