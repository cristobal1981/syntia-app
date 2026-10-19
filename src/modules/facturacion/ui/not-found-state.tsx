import Link from 'next/link'
import { ArrowLeft, SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PortalEmptyState } from '@/components/ui/portal-empty-state'

/** Pantalla de «no existe» con salida clara: explica qué pasó y devuelve a la lista. */
export function NotFoundState({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string
  description: string
  backHref: string
  backLabel: string
}) {
  return (
    <PortalEmptyState
      icon={SearchX}
      title={title}
      description={description}
      action={
        <Button asChild variant="outline">
          <Link href={backHref}>
            <ArrowLeft aria-hidden />
            {backLabel}
          </Link>
        </Button>
      }
    />
  )
}
