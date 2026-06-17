import type { PersonStatus } from '@/src/modules/directory/domain/types'
import { cn } from '@/lib/utils'
import { equipo } from '@/content/equipo'

const statusClass: Record<PersonStatus, string> = {
  active: 'bg-turquesa/15 text-turquesa dark:bg-primary/15 dark:text-primary',
  invited:
    'bg-service-fiscal/25 text-service-fiscal-on-light dark:bg-service-fiscal/15 dark:text-service-fiscal',
}

export function PersonStatusBadge({ status }: { status: PersonStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        statusClass[status]
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          status === 'active'
            ? 'bg-turquesa dark:bg-primary'
            : 'bg-service-fiscal-on-light dark:bg-service-fiscal'
        )}
        aria-hidden
      />
      {equipo.status[status]}
    </span>
  )
}
