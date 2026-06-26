import { ClipboardList, FileText, Scale } from 'lucide-react'

import { portal } from '@/content/portal'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getClientDashboardSnapshot } from '@/src/modules/portal/application/get-client-dashboard-snapshot'
import { ClientHomeDashboard } from '@/src/modules/portal/ui/client-home-dashboard'
import { PortalDashboardReady } from '@/src/modules/portal/ui/portal-dashboard-ready'
import { QuickLinkCard } from '@/src/modules/portal/ui/quick-link-card'

type ClientHomeProps = {
  user: PortalUser
}

export async function ClientHome({ user }: ClientHomeProps) {
  const copy = portal.home.client
  const snapshotResult = await getClientDashboardSnapshot(user)
  const snapshot = snapshotResult.ok ? snapshotResult.data : null

  return (
    <div className="flex flex-col gap-8">
      <header>
        <p className="text-sm text-muted-foreground">{copy.greeting}</p>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {user.name}
          {user.companyName ? (
            <span className="text-muted-foreground"> · {user.companyName}</span>
          ) : null}
        </h1>
      </header>

      <ClientHomeDashboard snapshot={snapshot} />

      <section aria-labelledby="client-quick-links">
        <h2
          id="client-quick-links"
          className="mb-4 font-sans text-lg font-semibold text-foreground"
        >
          {copy.quickLinksTitle}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <QuickLinkCard
            href="/proximamente"
            label="Documentos"
            description="Consulta y sube archivos"
            icon={FileText}
          />
          <QuickLinkCard
            href="/obligaciones"
            label="Obligaciones"
            description="Modelos tributarios por periodo"
            icon={Scale}
          />
          <QuickLinkCard
            href="/tramites"
            label="Trámites"
            description="Gestiones y soporte"
            icon={ClipboardList}
          />
        </div>
      </section>
      <PortalDashboardReady />
    </div>
  )
}
