import { BookOpen, ClipboardList, FileText, Scale } from 'lucide-react'

import { portal } from '@/content/portal'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'
import { getClientHomeData } from '@/src/modules/portal/application/get-client-home-data'
import { ClientHomeDashboard } from '@/src/modules/portal/ui/client-home-dashboard'
import { PortalDashboardReady } from '@/src/modules/portal/ui/portal-dashboard-ready'
import { QuickLinkCard } from '@/src/modules/portal/ui/quick-link-card'

type ClientHomeProps = {
  user: PortalUser
}

const QUICK_LINKS: Array<{
  href: WorkerSectionHref
  label: string
  icon: typeof FileText
}> = [
  { href: '/documentos', label: 'Documentos', icon: FileText },
  { href: '/obligaciones', label: 'Obligaciones', icon: Scale },
  { href: '/tramites', label: 'Trámites', icon: ClipboardList },
  { href: '/guias', label: 'Guías', icon: BookOpen },
]

export async function ClientHome({ user }: ClientHomeProps) {
  const copy = portal.home.client
  const [homeData, allowedSections] = await Promise.all([
    getClientHomeData(user),
    user.role === 'worker' ? getAllowedSectionsForWorker(user) : null,
  ])
  const quickLinks = allowedSections
    ? QUICK_LINKS.filter((link) => allowedSections.has(link.href))
    : QUICK_LINKS

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
        role={user.role}
        allowedSections={allowedSections ?? undefined}
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
          {quickLinks.map((link) => (
            <QuickLinkCard
              key={link.href}
              href={link.href}
              label={link.label}
              icon={link.icon}
            />
          ))}
        </div>
      </section>
      <PortalDashboardReady />
    </div>
  )
}
