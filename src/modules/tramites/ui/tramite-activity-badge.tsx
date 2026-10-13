import { FileUp, Flame, MessageCircleWarning, RefreshCw } from 'lucide-react'

import { cn } from '@/lib/utils'
import { tramites } from '@/content/tramites'
import type { TramiteActivitySignal } from '@/src/modules/tramites/domain/tramite-activity-signal'

const REASON_ICON: Record<TramiteActivitySignal['reason'], typeof Flame> = {
  new_tramite: Flame,
  unread_chatter: MessageCircleWarning,
  new_document: FileUp,
  status_change: RefreshCw,
  new_firma: RefreshCw,
  firma_due_soon: RefreshCw,
}

type TramiteActivityBadgeProps = {
  signal: TramiteActivitySignal | null
}

export function TramiteActivityBadge({ signal }: TramiteActivityBadgeProps) {
  if (!signal) return null

  const Icon = REASON_ICON[signal.reason]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        signal.isChangesRequested
          ? 'badge-status-changes-requested'
          : signal.reason === 'unread_chatter'
            ? 'badge-status-unread-message'
            : 'bg-muted text-foreground dark:bg-background'
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {signal.label}
      {signal.extraCount > 0 ? (
        <span
          className="inline-flex min-w-4 items-center justify-center rounded-full bg-foreground/15 px-1 text-[0.65rem] tabular-nums"
          aria-label={tramites.activity.extraCount.replace(
            '{count}',
            String(signal.extraCount)
          )}
        >
          +{signal.extraCount}
        </span>
      ) : null}
    </span>
  )
}
