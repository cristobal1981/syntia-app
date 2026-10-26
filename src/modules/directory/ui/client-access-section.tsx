'use client'

import { useState, useTransition } from 'react'
import { KeyRound, Mail } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { equipo } from '@/content/equipo'
import { resendClientAccessEmailAction } from '@/src/modules/directory/application/directory-mutations'
import type { ClientRecord } from '@/src/modules/directory/domain/types'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'

type ClientAccessButtonProps = {
  client: ClientRecord
}

/** Reenviar la invitación (cuenta sin activar) o restablecer la contraseña (cuenta activa). */
export function ClientAccessButton({ client }: ClientAccessButtonProps) {
  const copy = equipo.form.accessSection
  const [pending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isActive = client.status === 'active'

  function run() {
    startTransition(async () => {
      const result = await resendClientAccessEmailAction(client.id)
      if (result.ok) {
        toast.success(isActive ? copy.resetSuccess : copy.success)
        return
      }
      if (result.error === 'not_found') {
        toast.error(copy.errors.notFound)
        return
      }
      toast.error(result.message ?? copy.errors.sendFailed)
    })
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        disabled={pending}
        aria-busy={pending}
        onClick={() => (isActive ? setConfirmOpen(true) : run())}
      >
        {isActive ? (
          <KeyRound className="size-4" aria-hidden />
        ) : (
          <Mail className="size-4" aria-hidden />
        )}
        {isActive
          ? pending
            ? copy.resetting
            : copy.resetButton
          : pending
            ? copy.sending
            : copy.sendButton}
      </Button>

      <PortalConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={copy.resetConfirmTitle}
        description={copy.resetConfirmDescription}
        confirmLabel={copy.resetConfirmButton}
        confirmVariant="destructive"
        onConfirm={run}
      />
    </>
  )
}
