import { cn } from '@/lib/utils'
import type { TaskStateBadgeVariant } from '@/src/modules/tramites/domain/map-task-state'

const variantClasses: Record<TaskStateBadgeVariant, string> = {
  inProgress:
    'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200',
  done: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200',
  canceled: 'bg-red-100 text-red-900 dark:bg-red-950/80 dark:text-red-200',
  unknown: 'bg-muted text-muted-foreground',
}

type TaskStateBadgeProps = {
  label: string
  variant: TaskStateBadgeVariant
}

export function TaskStateBadge({ label, variant }: TaskStateBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant]
      )}
    >
      {label}
    </span>
  )
}
