'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { equipo } from '@/content/equipo'
import { startViewAsClientAction } from '@/src/modules/auth/application/start-view-as-action'
import type { ClientRecord } from '@/src/modules/directory/domain/types'

export function ClientViewAsSection({ client }: { client: ClientRecord }) {
  const copy = equipo.form.viewAsSection
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function open() {
    startTransition(async () => {
      const result = await startViewAsClientAction(client.id)
      if (result.ok) {
        router.push('/dashboard')
        router.refresh()
        return
      }
      toast.error(
        result.error === 'forbidden' ? copy.errors.forbidden : copy.errors.notFound
      )
    })
  }

  return (
    <section
      aria-labelledby="client-view-as-title"
      className="mt-8 rounded-lg border border-border bg-muted/30 px-4 py-5"
    >
      <h2
        id="client-view-as-title"
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
        onClick={open}
      >
        {pending ? copy.opening : copy.button}
      </Button>
    </section>
  )
}
