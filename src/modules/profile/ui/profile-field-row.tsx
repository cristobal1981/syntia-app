import { cn } from '@/lib/utils'
import { profile } from '@/content/profile'

type ProfileFieldRowProps = {
  label: string
  value: string
  className?: string
  monospace?: boolean
}

export function ProfileFieldRow({
  label,
  value,
  className,
  monospace = false,
}: ProfileFieldRowProps) {
  const isEmpty = !value.trim()

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'font-body text-sm text-foreground',
          isEmpty && 'text-muted-foreground',
          monospace && !isEmpty && 'tracking-wide'
        )}
      >
        {isEmpty ? profile.emptyValue : value}
      </dd>
    </div>
  )
}
