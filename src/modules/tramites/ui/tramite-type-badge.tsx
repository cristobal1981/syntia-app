import { cn } from '@/lib/utils'
import { tramites } from '@/content/tramites'
import type { TramiteListKind } from '@/src/modules/tramites/domain/merge-tramites-list'

const kindClasses: Record<TramiteListKind, string> = {
  tramite: 'badge-type-tramite',
  consulta: 'badge-type-consulta',
}

type TramiteTypeBadgeProps = {
  kind: TramiteListKind
}

export function TramiteTypeBadge({ kind }: TramiteTypeBadgeProps) {
  const label =
    kind === 'tramite'
      ? tramites.list.types.tramite
      : tramites.list.types.consulta

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        kindClasses[kind]
      )}
    >
      {label}
    </span>
  )
}
