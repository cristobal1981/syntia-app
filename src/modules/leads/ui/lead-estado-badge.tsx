import { cn } from '@/lib/utils'
import { leads as leadsCopy } from '@/content/leads'
import type { LeadEstado } from '@/src/modules/leads/domain/types'
import { ESTADO_BADGE_CLASS } from '@/src/modules/leads/ui/lead-estado-colors'

type LeadEstadoBadgeProps = {
  estado: LeadEstado
}

export function LeadEstadoBadge({ estado }: LeadEstadoBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium',
        ESTADO_BADGE_CLASS[estado]
      )}
    >
      {leadsCopy.estados[estado]}
    </span>
  )
}
