import { tramites } from '@/content/tramites'
import { cn } from '@/lib/utils'
import type { TramiteAssignee } from '@/src/modules/tramites/domain/types'
import { assigneesWithPhoto, formatAssigneesLabel } from '@/src/modules/tramites/domain/format-assignees'
import { ChatterAuthorAvatar } from '@/src/modules/portal/ui/chatter-author-avatar'

/**
 * Quién lo lleva, discreto: foto pequeña (hasta tres, solapadas) y el nombre.
 * Las fotos salen de `/api/portal/partner-avatar`, cacheada en el servidor y
 * compartida entre todos los clientes, y en el navegador un día.
 */
export function TramiteAssignees({
  assignees,
  className,
}: {
  assignees: readonly TramiteAssignee[]
  className?: string
}) {
  const label = formatAssigneesLabel(assignees)
  if (!label) return null

  const photos = assigneesWithPhoto(assignees)

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2 text-xs text-muted-foreground', className)}>
      {photos.length > 0 ? (
        <span className="flex shrink-0 -space-x-1.5" aria-hidden>
          {photos.map((assignee) => (
            <ChatterAuthorAvatar
              key={assignee.userId}
              name={assignee.name}
              partnerId={assignee.partnerId}
              size="xs"
              className="ring-2 ring-background"
            />
          ))}
        </span>
      ) : null}
      <span className="sr-only">{tramites.assignee.label}</span>
      <span className="min-w-0 truncate font-medium text-foreground/80">{label}</span>
    </span>
  )
}
