import type { LucideIcon } from 'lucide-react'

import { AppLink } from '@/components/ui/app-link'
import type { OnboardingSolicitudStats } from '@/src/modules/onboarding/domain/onboarding-solicitud-stats'
import type { IntegrationStatus } from '@/src/modules/portal/domain/types'
import { DataTable } from '@/src/modules/portal/ui/data-table'
import { StatCard } from '@/src/modules/portal/ui/stat-card'
import { SolicitudesChartCard } from '@/src/modules/portal/ui/onboarding-solicitudes-chart'
import { IntegrationsPanel } from '@/src/modules/portal/ui/integrations-panel'
import { PortalDashboardReady } from '@/src/modules/portal/ui/portal-dashboard-ready'

type StatTile = {
  label: string
  value: number
  icon: LucideIcon
  href: string
}

type StaffHomeBentoProps = {
  greeting: string
  displayName: string
  requestsTitle: string
  solicitudStats: OnboardingSolicitudStats
  statTiles: StatTile[]
  tableTitle: string
  tableHref: string
  tableViewAllLabel: string
  tableHeaders: string[]
  tableRows: string[][]
  tableEmptyMessage: string
  integrations: IntegrationStatus[]
  integrationsTitle: string
}

/**
 * Layout compartido para el home de admin y asesor: mismo bento (gráfica de
 * solicitudes + tiles de resumen + tabla de equipo/clientes + integraciones),
 * solo cambian los datos que le pasa cada rol.
 */
export function StaffHomeBento({
  greeting,
  displayName,
  requestsTitle,
  solicitudStats,
  statTiles,
  tableTitle,
  tableHref,
  tableViewAllLabel,
  tableHeaders,
  tableRows,
  tableEmptyMessage,
  integrations,
  integrationsTitle,
}: StaffHomeBentoProps) {
  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-muted-foreground">{greeting}</p>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {displayName}
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          <SolicitudesChartCard title={requestsTitle} stats={solicitudStats} />

          <div className="portal-home-card rounded-xl p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-sans text-base font-semibold text-foreground">
                {tableTitle}
              </h2>
              <AppLink href={tableHref} className="text-sm">
                {tableViewAllLabel}
              </AppLink>
            </div>
            {tableRows.length ? (
              <DataTable headers={tableHeaders} rows={tableRows} />
            ) : (
              <p className="text-sm text-muted-foreground">{tableEmptyMessage}</p>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {statTiles.map((tile) => (
            <StatCard
              key={tile.label}
              label={tile.label}
              value={tile.value}
              icon={tile.icon}
              href={tile.href}
            />
          ))}
          <IntegrationsPanel
            initialIntegrations={integrations}
            title={integrationsTitle}
            showRefresh
          />
        </div>
      </div>

      <PortalDashboardReady />
    </div>
  )
}
