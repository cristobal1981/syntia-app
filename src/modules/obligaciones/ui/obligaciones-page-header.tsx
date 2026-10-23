import { obligaciones } from '@/content/obligaciones'
import { PortalRefreshButton } from '@/src/modules/portal/ui/portal-refresh-button'

/** Cabecera de la pantalla: no depende de los datos, así que se pinta antes que ellos (y también en `loading`). */
export function ObligacionesPageHeader() {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {obligaciones.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{obligaciones.description}</p>
      </div>
      <PortalRefreshButton
        label={obligaciones.refreshButton}
        refreshingLabel={obligaciones.refreshing}
      />
    </header>
  )
}
