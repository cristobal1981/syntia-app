'use client'

import { TicketPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portal } from '@/content/portal'
import { tramites } from '@/content/tramites'
import { usePortalCreateConsultaOptional } from '@/src/modules/portal/ui/portal-create-consulta-context'

export function ClientHomeEducationCard() {
  const copy = portal.home.client
  const createConsulta = usePortalCreateConsultaOptional()

  const actionButton = createConsulta?.isAvailable ? (
    <Button
      type="button"
      className="shrink-0"
      onClick={() => createConsulta.openCreateConsulta()}
    >
      <TicketPlus className="size-4" aria-hidden />
      {copy.educationAction}
    </Button>
  ) : (
    <Button type="button" className="shrink-0" asChild>
      <a href="/tramites">{tramites.createConsulta.button}</a>
    </Button>
  )

  return (
    <section
      aria-labelledby="client-home-education"
      className="portal-home-card rounded-xl border-primary/25 bg-primary/5 p-5 md:p-6"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <div className="min-w-0 flex-1">
          <h2
            id="client-home-education"
            className="font-sans text-lg font-semibold text-foreground"
          >
            {copy.educationTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {copy.educationDescription}
          </p>
        </div>
        <div className="shrink-0 md:self-center">{actionButton}</div>
      </div>
    </section>
  )
}
