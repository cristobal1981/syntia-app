'use client'

import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { equipo } from '@/content/equipo'
import type { ClientRecord, PersonStatus } from '@/src/modules/directory/domain/types'
import { ClientAccessButton } from '@/src/modules/directory/ui/client-access-section'
import { ClientActiveButton } from '@/src/modules/directory/ui/client-active-button'
import { ClientViewAsButton } from '@/src/modules/directory/ui/client-view-as-section'
import { PersonStatusBadge } from '@/src/modules/directory/ui/person-status-badge'

type ClientEditHeaderProps = {
  client: ClientRecord
  /** Estado actual de la cuenta (puede haber cambiado desde aquí sin recargar la lista). */
  status: PersonStatus
  onStatusChange: (status: PersonStatus) => void
}

/**
 * Cabecera del drawer de un cliente: quién es y, lo primero que se ve, lo que más se hace con él
 * desde aquí (ver su portal, reenviar el acceso, activar o desactivar la cuenta). Editar sus datos
 * queda debajo.
 */
export function ClientEditHeader({ client, status, onStatusChange }: ClientEditHeaderProps) {
  return (
    <header className="shrink-0 border-b border-border px-6 pt-6 pb-5 pr-14 dark:border-border/50">
      <DialogTitle className="truncate text-left">{client.name}</DialogTitle>
      <DialogDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-left">
        <span className="sr-only">{equipo.form.editClient}: </span>
        <span className="min-w-0 truncate">{client.email}</span>
        <PersonStatusBadge status={status} />
      </DialogDescription>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ClientViewAsButton client={client} />
        <ClientAccessButton client={{ ...client, status }} />
        <ClientActiveButton
          clientId={client.id}
          status={status}
          onStatusChange={onStatusChange}
        />
      </div>
      <p className="mt-3 max-w-prose text-xs leading-relaxed text-muted-foreground">
        {equipo.form.viewAsSection.helper}
      </p>
      {status === 'invited' ? (
        <p className="mt-1 max-w-prose text-xs leading-relaxed text-muted-foreground">
          {equipo.form.activeToggle.invitedHint}
        </p>
      ) : null}
    </header>
  )
}
