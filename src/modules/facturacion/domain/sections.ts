import type { NavIconId } from '@/src/modules/portal/domain/types'

type SectionId =
  | 'panel'
  | 'invoices'
  | 'parties'
  | 'settings'

export type SectionDefinition = {
  id: SectionId
  /** Segmento de la URL bajo `/facturacion`. */
  slug: string
  icon: NavIconId
  /** Muestra el selector de año y las cifras del periodo. */
  usesPeriod: boolean
  /** Muestra también los trimestres. */
  usesQuarter: boolean
}

const section = (
  id: SectionId,
  slug: string,
  icon: NavIconId,
  usesPeriod = true,
  usesQuarter = true
): SectionDefinition => ({ id, slug, icon, usesPeriod, usesQuarter })

export const SECTIONS: readonly SectionDefinition[] = [
  section('panel', 'panel', 'home'),
  section('invoices', 'facturas', 'invoicing'),
  // El directorio de clientes no depende del periodo: lo facturado y lo pendiente son de siempre.
  section('parties', 'clientes', 'contacts', false, false),
  // Datos fiscales del emisor: ajustes, sin periodo.
  section('settings', 'configuracion', 'settings', false, false),
]

const FACTURACION_PATH = '/facturacion'

export function sectionHref(section: Pick<SectionDefinition, 'slug'>): string {
  return `${FACTURACION_PATH}/${section.slug}`
}

/**
 * Sección de una ruta (barra final incluida), también para las pantallas anidadas:
 * `/facturacion/facturas/abc/editar` pertenece a «Facturas». Si no coincide ninguna, el panel.
 */
export function sectionForPath(pathname: string): SectionDefinition {
  const normalized = pathname.replace(/\/+$/, '')
  return (
    SECTIONS.find((candidate) => sectionHref(candidate) === normalized || normalized.startsWith(`${sectionHref(candidate)}/`)) ??
    SECTIONS[0]
  )
}

/** Pantalla de detalle o edición dentro de una sección (ocupa todo el ancho, sin filtros de periodo). */
export function isNestedPath(pathname: string): boolean {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized !== sectionHref(sectionForPath(normalized)) && normalized.startsWith(`${FACTURACION_PATH}/`)
}
