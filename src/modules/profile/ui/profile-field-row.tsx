import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { profile } from '@/content/profile'

type ProfileFieldRowProps = {
  label: string
  value: string
  icon?: LucideIcon
  className?: string
  valueClassName?: string
  monospace?: boolean
}

export function ProfileFieldRow({
  label,
  value,
  icon: Icon,
  className,
  valueClassName,
  monospace = false,
}: ProfileFieldRowProps) {
  const isEmpty = !value.trim()
  const displayValue = isEmpty ? profile.emptyValue : value

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon ? <Icon className="size-3.5 shrink-0 text-icon-muted" aria-hidden /> : null}
        <span>{label}</span>
      </dt>
      <dd
        className={cn(
          'font-body text-sm text-foreground',
          isEmpty && 'text-muted-foreground',
          monospace && !isEmpty && 'tracking-wide',
          valueClassName
        )}
      >
        {displayValue}
      </dd>
    </div>
  )
}
