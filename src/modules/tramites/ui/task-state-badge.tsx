import { cn } from '@/lib/utils'
import type { TaskStateBadgeVariant } from '@/src/modules/tramites/domain/map-task-state'

const variantClasses: Record<TaskStateBadgeVariant, string> = {
  inProgress: 'badge-status-pending',
  changesRequested: 'badge-status-changes-requested',
  done: 'badge-status-done',
  canceled: 'badge-status-canceled',
  unknown: 'bg-muted text-muted-foreground dark:bg-background dark:text-subtle-foreground',
}

type TaskStateBadgeProps = {
  label: string
  variant: TaskStateBadgeVariant
}

export function TaskStateBadge({ label, variant }: TaskStateBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant]
      )}
    >
      {label}
    </span>
  )
}
