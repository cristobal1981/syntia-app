'use client'

import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { equipo } from '@/content/equipo'
import type { ClientRecord } from '@/src/modules/directory/domain/types'
import { ClientAccessButton } from '@/src/modules/directory/ui/client-access-section'
import { ClientViewAsButton } from '@/src/modules/directory/ui/client-view-as-section'
import { PersonStatusBadge } from '@/src/modules/directory/ui/person-status-badge'

/**
 * Cabecera del drawer de un cliente: quién es y, lo primero que se ve, lo que más se hace con él
 * desde aquí (ver su portal, reenviar el acceso). Editar sus datos queda debajo.
 */
export function ClientEditHeader({ client }: { client: ClientRecord }) {
  return (
    <header className="shrink-0 border-b border-border px-6 pt-6 pb-5 pr-14 dark:border-border/50">
      <DialogTitle className="truncate text-left">{client.name}</DialogTitle>
      <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-left">
        <span className="sr-only">{equipo.form.editClient}: </span>
        <span className="min-w-0 truncate">{client.email}</span>
        <PersonStatusBadge status={client.status} />
      </DialogDescription>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ClientViewAsButton client={client} />
        <ClientAccessButton client={client} />
      </div>
      <p className="mt-3 max-w-prose text-xs leading-relaxed text-muted-foreground">
        {equipo.form.viewAsSection.helper}
      </p>
    </header>
  )
}
