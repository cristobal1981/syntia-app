'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { equipo } from '@/content/equipo'
import { resendClientAccessEmailAction } from '@/src/modules/directory/application/directory-mutations'
import type { ClientRecord } from '@/src/modules/directory/domain/types'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'

type ClientAccessSectionProps = {
  client: ClientRecord
}

export function ClientAccessSection({ client }: ClientAccessSectionProps) {
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
      <section
        aria-labelledby="client-access-section-title"
        className="mt-8 rounded-lg border border-border bg-muted/30 px-4 py-5"
      >
        <h2
          id="client-access-section-title"
          className="font-sans text-sm font-semibold text-foreground"
        >
          {copy.title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
        <Button
          type="button"
          variant="outline"
          className="mt-4"
          disabled={pending}
          aria-busy={pending}
          onClick={() => (isActive ? setConfirmOpen(true) : run())}
        >
          {isActive
            ? pending
              ? copy.resetting
              : copy.resetButton
            : pending
              ? copy.sending
              : copy.sendButton}
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">{copy.loginHint}</p>
      </section>

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
