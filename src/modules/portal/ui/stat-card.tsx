import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: number
  icon: LucideIcon
  href?: string
}

export function StatCard({ label, value, icon: Icon, href }: StatCardProps) {
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
