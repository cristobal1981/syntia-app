import { BookOpen, ClipboardList, FileText, Scale } from 'lucide-react'

import { portal } from '@/content/portal'
import type { WorkerSectionHref } from '@/src/modules/colaboradores/domain/types'
import { QuickLinkCard } from '@/src/modules/portal/ui/quick-link-card'

export type QuickLink = {
  href: WorkerSectionHref
  label: string
  icon: typeof FileText
}

export const QUICK_LINKS: QuickLink[] = [
  { href: '/documentos', label: 'Documentos', icon: FileText },
  { href: '/obligaciones', label: 'Obligaciones', icon: Scale },
  { href: '/tramites', label: 'Trámites', icon: ClipboardList },
  { href: '/guias', label: 'Guías', icon: BookOpen },
]

/**
 * Saludo y accesos rápidos de un cliente: no dependen de ningún dato, así que
 * se pintan idénticos en la pantalla de carga y en la página (sin saltos).
 */
export function ClientHomeGreeting({
  name,
  companyName,
}: {
  name: string
  companyName?: string
}) {
  const copy = portal.home.client

  return (
    <header>
      <p className="text-sm text-muted-foreground">{copy.greeting}</p>
      <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
        {name}
        {companyName ? <span className="text-muted-foreground"> · {companyName}</span> : null}
      </h1>
    </header>
  )
}

export function ClientHomeQuickLinksSection({ links }: { links: QuickLink[] }) {
  const copy = portal.home.client

  return (
    <section aria-labelledby="client-quick-links">
      <h2
        id="client-quick-links"
        className="mb-4 font-sans text-xs font-medium tracking-wide text-muted-foreground uppercase"
      >
        {copy.quickLinksTitle}
      </h2>
      <div className="flex flex-wrap gap-x-2 gap-y-1">
        {links.map((link) => (
          <QuickLinkCard key={link.href} href={link.href} label={link.label} icon={link.icon} />
        ))}
      </div>
    </section>
  )
}
