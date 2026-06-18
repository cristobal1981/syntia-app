'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { equipo } from '@/content/equipo'
import { resendClientAccessEmailAction } from '@/src/modules/directory/application/directory-mutations'
import type { ClientRecord } from '@/src/modules/directory/domain/types'

type ClientAccessSectionProps = {
  client: ClientRecord
}

export function ClientAccessSection({ client }: ClientAccessSectionProps) {
  const copy = equipo.form.accessSection
  const formCopy = equipo.form
  const [pending, startTransition] = useTransition()

  function handleSend() {
    startTransition(async () => {
      const result = await resendClientAccessEmailAction(client.id)
      if (result.ok) {
        toast.success(copy.success)
        return
      }
      if (result.error === 'forbidden') {
        toast.error(formCopy.errors.forbidden)
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
    <section
      aria-labelledby="client-access-section-title"
      className="mt-8 rounded-lg border border-border bg-muted/20 px-4 py-5"
    >
      <h2
        id="client-access-section-title"
        className="font-sans text-sm font-semibold text-foreground"
      >
        {copy.title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
      <p className="mt-2 text-sm text-muted-foreground">{copy.loginHint}</p>
      <Button
        type="button"
        variant="outline"
        className="mt-4"
        onClick={handleSend}
        disabled={pending}
        aria-busy={pending}
      >
        {pending ? copy.sending : copy.sendButton}
      </Button>
    </section>
  )
}
