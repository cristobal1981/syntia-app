import { leads as leadsCopy } from '@/content/leads'
import type { FunnelEntry } from '@/src/modules/leads/domain/types'
import { ESTADO_SOLID_CLASS } from '@/src/modules/leads/ui/lead-estado-colors'
import { cn } from '@/lib/utils'

type LeadsFunnelBarProps = {
  funnel: FunnelEntry[]
}

export function LeadsFunnelBar({ funnel }: LeadsFunnelBarProps) {
  const copy = leadsCopy.funnel
  const total = funnel.reduce((sum, entry) => sum + entry.count, 0)
  const visible = funnel.filter((entry) => entry.count > 0)

  return (
    <div className="portal-home-card rounded-xl p-5">
      <h2 className="font-sans text-base font-semibold text-foreground">{copy.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>

      {total === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{leadsCopy.emptyTitle}</p>
      ) : (
        <>
          <div className="mt-4 flex h-3 gap-0.5">
            {visible.map((entry, index) => (
              <div
                key={entry.estado}
                title={`${leadsCopy.estados[entry.estado]}: ${entry.count}`}
                className={cn(
                  ESTADO_SOLID_CLASS[entry.estado],
                  index === 0 && 'rounded-l-[4px]',
                  index === visible.length - 1 && 'rounded-r-[4px]'
                )}
                style={{ width: `${entry.pct}%` }}
              />
            ))}
          </div>

          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5">
            {funnel.map((entry) => (
              <li
                key={entry.estado}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className={cn('size-1.5 rounded-full', ESTADO_SOLID_CLASS[entry.estado])}
                  aria-hidden
                />
                {leadsCopy.estados[entry.estado]}
                <span className="font-medium text-foreground">{entry.count}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
