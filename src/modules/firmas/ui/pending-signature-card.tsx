'use client'

import { Button } from '@/components/ui/button'
import { firmas } from '@/content/firmas'
import type { PendingSignatureRequest } from '@/src/modules/firmas/domain/types'
import { cn } from '@/lib/utils'

type PendingSignatureCardProps = {
  request: PendingSignatureRequest
}

function formatDate(value?: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function PendingSignatureCard({ request }: PendingSignatureCardProps) {
  const dateLabel = formatDate(request.createDate)

  return (
    <article className="portal-home-card flex flex-col gap-4 rounded-xl p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
      <div className="min-w-0 flex-1">
        <h2 className="font-sans text-base font-semibold text-foreground">
          {request.reference}
        </h2>
        {dateLabel ? (
          <p className="mt-1 text-sm text-muted-foreground">{dateLabel}</p>
        ) : null}
        <p className="mt-2 text-xs text-muted-foreground">{firmas.signHint}</p>
      </div>
      <Button
        asChild
        className={cn('min-h-11 shrink-0 cursor-pointer self-start sm:self-center')}
      >
        <a href={request.signUrl} target="_blank" rel="noopener noreferrer">
          {firmas.signButton}
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </a>
      </Button>
    </article>
  )
}
