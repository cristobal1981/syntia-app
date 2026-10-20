import type { PersonStatus } from '@/src/modules/directory/domain/types'
import { cn } from '@/lib/utils'
import { colaboradores } from '@/content/colaboradores'
import { equipo } from '@/content/equipo'

/** Un colaborador, además, puede tener el acceso desactivado por su titular. */
export type PersonBadgeStatus = PersonStatus | 'disabled'

const statusClass: Record<PersonBadgeStatus, string> = {
  active: 'bg-turquesa/15 text-turquesa dark:bg-primary/15 dark:text-primary',
  invited:
    'bg-service-fiscal/25 text-service-fiscal-on-light dark:bg-service-fiscal/15 dark:text-service-fiscal-on-dark',
  archived: 'bg-muted text-muted-foreground',
  disabled: 'bg-destructive/10 text-destructive',
}

const statusDotClass: Record<PersonBadgeStatus, string> = {
  active: 'bg-turquesa dark:bg-primary',
  invited: 'bg-service-fiscal-on-light dark:bg-service-fiscal-on-dark',
  archived: 'bg-muted-foreground',
  disabled: 'bg-destructive',
}

export function PersonStatusBadge({ status }: { status: PersonBadgeStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        statusClass[status]
      )}
    >
      <span className={cn('size-1.5 rounded-full', statusDotClass[status])} aria-hidden />
      {status === 'disabled' ? colaboradores.status.disabled : equipo.status[status]}
    </span>
  )
}
