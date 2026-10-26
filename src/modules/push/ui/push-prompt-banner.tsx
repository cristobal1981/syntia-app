'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { pushNotifications as copy } from '@/content/push-notifications'
import { resolvePushPrompt } from '@/src/modules/push/domain/push-prompt'
import { isPushConfigured, usePushSubscription } from '@/src/modules/push/ui/use-push-subscription'

const STORAGE_PREFIX = 'syntia-push-prompt-dismissed:'

function readDismissed(userId: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + userId) === '1'
  } catch {
    // Sin almacenamiento (modo privado): se enseña, pero cerrarlo solo vale hasta recargar.
    return false
  }
}

/**
 * Aviso en Inicio para activar las notificaciones push en este dispositivo: es la
 * forma de enterarse de las novedades sin abrir la web. Sale una sola vez por
 * dispositivo y cuenta; el ajuste sigue en el perfil.
 */
export function PushPromptBanner({ userId }: { userId: string }) {
  const { state, pending, enable } = usePushSubscription()
  const [dismissed, setDismissed] = useState<boolean | null>(null)

  useEffect(() => {
    // localStorage solo existe en cliente — no se puede leer durante SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDismissed(readDismissed(userId))
  }, [userId])

  const prompt = resolvePushPrompt({ configured: isPushConfigured, state, dismissed })
  if (!prompt) return null

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_PREFIX + userId, '1')
    } catch {
      // Sin almacenamiento: se cierra hasta la próxima carga.
    }
    setDismissed(true)
  }

  async function handleEnable() {
    const error = await enable()
    if (!error) {
      toast.success(copy.toasts.enabled)
    } else if (error !== 'denied') {
      toast.error(copy.errors[error])
    }
  }

  const install = prompt === 'install'

  return (
    <section
      aria-label={install ? copy.prompt.installTitle : copy.prompt.title}
      className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-linear-to-r from-primary/20 via-primary/10 to-primary/5 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0">
        <p className="font-sans text-base font-semibold text-foreground">
          {install ? copy.prompt.installTitle : copy.prompt.title}
        </p>
        <p className="mt-0.5 max-w-2xl text-sm leading-snug text-muted-foreground text-pretty">
          {install ? copy.states.installRequired : copy.prompt.description}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {install ? null : (
          <Button type="button" size="sm" disabled={pending} onClick={() => void handleEnable()}>
            {copy.prompt.enable}
          </Button>
        )}
        <Button type="button" size="sm" variant="ghost" onClick={dismiss}>
          {install ? copy.prompt.understood : copy.prompt.dismiss}
        </Button>
      </div>
    </section>
  )
}
