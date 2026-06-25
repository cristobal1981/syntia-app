'use client'

import { TicketPlus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portal } from '@/content/portal'
import { tramites } from '@/content/tramites'
import { usePortalCreateConsultaOptional } from '@/src/modules/portal/ui/portal-create-consulta-context'

export function ClientHomeEducationCard() {
  const copy = portal.home.client
  const createConsulta = usePortalCreateConsultaOptional()

  return (
    <section
      aria-labelledby="client-home-education"
      className="portal-home-card rounded-xl border-primary/25 bg-primary/5 p-5 md:p-6"
    >
      <h2
        id="client-home-education"
        className="font-sans text-lg font-semibold text-foreground"
      >
        {copy.educationTitle}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {copy.educationDescription}
      </p>
      {createConsulta?.isAvailable ? (
        <Button
          type="button"
          className="mt-4"
          onClick={createConsulta.openCreateConsulta}
        >
          <TicketPlus className="size-4" aria-hidden />
          {copy.educationAction}
        </Button>
      ) : (
        <Button type="button" className="mt-4" asChild>
          <a href="/tramites">{tramites.createConsulta.button}</a>
        </Button>
      )}
    </section>
  )
}
