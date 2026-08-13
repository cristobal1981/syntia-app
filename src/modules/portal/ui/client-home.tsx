import { BookOpen, ClipboardList, FileText, Scale } from 'lucide-react'

import { portal } from '@/content/portal'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getClientHomeData } from '@/src/modules/portal/application/get-client-home-data'
import { ClientHomeDashboard } from '@/src/modules/portal/ui/client-home-dashboard'
import { PortalDashboardReady } from '@/src/modules/portal/ui/portal-dashboard-ready'
import { QuickLinkCard } from '@/src/modules/portal/ui/quick-link-card'

type ClientHomeProps = {
  user: PortalUser
}

export async function ClientHome({ user }: ClientHomeProps) {
  const copy = portal.home.client
  const homeData = await getClientHomeData(user)

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

      <ClientHomeDashboard
        snapshot={homeData.snapshot}
        snapshotError={homeData.snapshotError}
        initialNotifications={homeData.notifications}
      />

      <section aria-labelledby="client-quick-links">
        <h2
          id="client-quick-links"
          className="mb-4 font-sans text-xs font-medium tracking-wide text-muted-foreground uppercase"
        >
          {copy.quickLinksTitle}
        </h2>
        <div className="flex flex-wrap gap-x-2 gap-y-1">
          <QuickLinkCard href="/documentos" label="Documentos" icon={FileText} />
          <QuickLinkCard href="/obligaciones" label="Obligaciones" icon={Scale} />
          <QuickLinkCard href="/tramites" label="Trámites" icon={ClipboardList} />
          <QuickLinkCard href="/guias" label="Guías" icon={BookOpen} />
        </div>
      </section>
      <PortalDashboardReady />
    </div>
  )
}
