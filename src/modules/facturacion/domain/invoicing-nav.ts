import { facturacion } from '@/content/facturacion'
import { SECTIONS, sectionHref, type SectionNavGroup } from '@/src/modules/facturacion/domain/sections'
import type { NavItem } from '@/src/modules/portal/domain/types'

const GROUP_ICON: Record<SectionNavGroup, NavItem['icon']> = {
  billing: 'invoicing',
  accounting: 'books',
}

/** Los dos grupos desplegables del sidebar (Facturación y Contabilidad) con sus secciones. */
export function buildInvoicingNavItems(): NavItem[] {
  return (['billing', 'accounting'] as const).map((group) => ({
    label: facturacion.nav.groups[group],
    implemented: true,
    icon: GROUP_ICON[group],
    children: SECTIONS.filter((section) => section.navGroup === group).map((section) => ({
      label: facturacion.tabs[section.id],
      href: sectionHref(section),
      implemented: true,
      icon: section.icon,
    })),
  }))
}
