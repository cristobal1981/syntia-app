'use client'

import { useState, useTransition } from 'react'
import { Loader2, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { equipo } from '@/content/equipo'
import { setClientActiveAction } from '@/src/modules/directory/application/directory-mutations'
import type { PersonStatus } from '@/src/modules/directory/domain/types'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'

type ClientActiveButtonProps = {
  clientId: string
  status: PersonStatus
  /** El estado ya cambiado en el servidor: el drawer lo refleja sin cerrarse. */
  onStatusChange: (status: PersonStatus) => void
}

/**
 * Activar o desactivar la cuenta del cliente al instante, con el icono de encendido y apagado (como
 * el de los colaboradores del perfil). Desactivar pide confirmación porque corta su acceso; activar no.
 */
export function ClientActiveButton({ clientId, status, onStatusChange }: ClientActiveButtonProps) {
  const copy = equipo.form.activeToggle
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isActive = status !== 'archived'

  function run() {
    startTransition(async () => {
      const result = await setClientActiveAction(clientId, !isActive)
      if (result.ok && result.status) {
        onStatusChange(result.status)
        toast.success(isActive ? copy.deactivated : copy.activated)
        return
      }
      toast.error(
        result.ok === false && result.error === 'forbidden' ? copy.errors.forbidden : copy.errors.failed
      )
    })
  }

  const Icon = pending ? Loader2 : isActive ? PowerOff : Power

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        disabled={pending}
        aria-busy={pending}
        onClick={() => (isActive ? setConfirmOpen(true) : run())}
      >
        <Icon
          className={pending ? 'size-4 animate-spin motion-reduce:animate-none' : 'size-4'}
          aria-hidden
        />
        {isActive ? copy.deactivate : copy.activate}
      </Button>

      <PortalConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={copy.confirmTitle}
        description={copy.confirmDescription}
        confirmLabel={copy.confirmButton}
        confirmVariant="destructive"
        onConfirm={run}
      />
    </>
  )
}
