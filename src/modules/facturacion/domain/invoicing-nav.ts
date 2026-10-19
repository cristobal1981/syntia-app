import { facturacion } from '@/content/facturacion'
import { SECTIONS, sectionHref } from '@/src/modules/facturacion/domain/sections'
import type { NavItem } from '@/src/modules/portal/domain/types'

/** El desplegable «Facturación» del sidebar con sus secciones. */
export function buildInvoicingNavItems(): NavItem[] {
  return [
    {
      label: facturacion.nav.group,
      implemented: true,
      icon: 'invoicing',
      children: SECTIONS.map((section) => ({
        label: facturacion.tabs[section.id],
        href: sectionHref(section),
        implemented: true,
        icon: section.icon,
      })),
    },
  ]
}
