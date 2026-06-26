import { cn } from '@/lib/utils'
import type { TaskStateBadgeVariant } from '@/src/modules/tramites/domain/map-task-state'

const variantClasses: Record<TaskStateBadgeVariant, string> = {
  inProgress: 'badge-status-pending',
  done: 'badge-status-done',
  canceled: 'badge-status-canceled',
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
