'use client'

import { toast } from 'sonner'

import { pushNotifications as copy } from '@/content/push-notifications'
import { isPushConfigured, usePushSubscription } from '@/src/modules/push/ui/use-push-subscription'

/**
 * Pie discreto del panel de novedades: si este dispositivo aún no recibe avisos, un enlace para
 * activarlos. No sale si ya están activas, bloqueadas o el dispositivo no las admite. Solo se
 * monta con el panel abierto, así que no consulta nada mientras está cerrado.
 */
export function PushPanelHint() {
  const { state, pending, enable } = usePushSubscription()
  if (!isPushConfigured || state.kind !== 'off') return null

  async function handleEnable() {
    const error = await enable()
    if (!error) toast.success(copy.toasts.enabled)
    else if (error !== 'denied') toast.error(copy.errors[error])
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-2.5">
      <p className="text-xs text-muted-foreground">{copy.prompt.panelHint}</p>
      <button
        type="button"
        disabled={pending}
        onClick={() => void handleEnable()}
        className="shrink-0 cursor-pointer rounded text-xs font-medium text-primary transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60"
      >
        {copy.prompt.enable}
      </button>
    </div>
  )
}
