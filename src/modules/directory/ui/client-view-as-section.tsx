'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { Eye, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { equipo } from '@/content/equipo'
import { startViewAsClientAction } from '@/src/modules/auth/application/start-view-as-action'
import {
  beginViewAsLaunch,
  endViewAsLaunch,
} from '@/src/modules/auth/ui/view-as-launch-store'
import type { ClientRecord } from '@/src/modules/directory/domain/types'

/**
 * «Ver como cliente»: abre el portal tal y como lo ve ese cliente, en solo lectura. Es la primera
 * acción del drawer pero no va en sólido: el único relleno del drawer es «Guardar cambios».
 */
export function ClientViewAsButton({ client }: { client: ClientRecord }) {
  const copy = equipo.form.viewAsSection
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function open() {
    // El cohete sale ya y se queda hasta que el portal del cliente está pintado.
    beginViewAsLaunch()
    startTransition(async () => {
      const result = await startViewAsClientAction(client.id)
      if (result.ok) {
        router.push('/dashboard')
        router.refresh()
        return
      }
      endViewAsLaunch()
      toast.error(
        result.error === 'forbidden' ? copy.errors.forbidden : copy.errors.notFound
      )
    })
  }

  return (
    <Button type="button" variant="outline" disabled={pending} aria-busy={pending} onClick={open}>
      {pending ? (
        <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
      ) : (
        <Eye className="size-4" aria-hidden />
      )}
      {pending ? copy.opening : copy.button}
    </Button>
  )
}
