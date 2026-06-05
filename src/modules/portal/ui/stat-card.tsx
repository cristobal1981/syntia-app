import type { StatItem } from '@/src/modules/portal/domain/types'

type StatCardProps = {
  stat: StatItem
}

export function StatCard({ stat }: StatCardProps) {
  return (
    <div className="rounded-xl border border-agua/30 bg-card/80 p-5">
      <p className="text-sm text-muted-foreground">{stat.label}</p>
      <p className="mt-2 font-sans text-3xl font-semibold text-foreground tabular-nums">
        {stat.value}
      </p>
      {stat.hint ? (
        <p className="mt-1 text-xs text-primary">{stat.hint}</p>
      ) : null}
    </div>
  )
}
