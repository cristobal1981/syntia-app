import { Euro, TrendingUp, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { leads as leadsCopy } from '@/content/leads'
import { formatEuro, formatPct } from '@/src/modules/leads/ui/lead-format'

type LeadsKpiTilesProps = {
  totalLeads: number
  overallConversionPct: number
  lostAnnualValue: number
}

type Tile = { label: string; value: string; icon: LucideIcon }

export function LeadsKpiTiles({
  totalLeads,
  overallConversionPct,
  lostAnnualValue,
}: LeadsKpiTilesProps) {
  const copy = leadsCopy.kpi
  const tiles: Tile[] = [
    { label: copy.totalLeads, value: String(totalLeads), icon: Users },
    { label: copy.conversionRate, value: formatPct(overallConversionPct), icon: TrendingUp },
    { label: copy.lostAnnualValue, value: formatEuro(lostAnnualValue), icon: Euro },
  ]

  return (
    <div className="portal-home-card flex flex-col divide-y divide-border rounded-xl sm:flex-row sm:divide-x sm:divide-y-0 dark:divide-border/60">
      {tiles.map((tile) => {
        const Icon = tile.icon
        return (
          <div key={tile.label} className="flex flex-1 items-start gap-3 p-4 md:p-5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="size-4.5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-semibold tabular-nums text-foreground">
                {tile.value}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{tile.label}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
