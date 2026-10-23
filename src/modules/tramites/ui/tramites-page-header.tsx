import { tramites } from '@/content/tramites'
import { PortalRefreshButton } from '@/src/modules/portal/ui/portal-refresh-button'

/** Cabecera de la pantalla: no depende de los datos, así que se pinta antes que ellos (y también en `loading`). */
export function TramitesPageHeader() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {tramites.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{tramites.description}</p>
      </div>
      <PortalRefreshButton
        label={tramites.refreshButton}
        refreshingLabel={tramites.refreshing}
      />
    </header>
  )
}
