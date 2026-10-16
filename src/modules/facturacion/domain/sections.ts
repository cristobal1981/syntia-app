import type { NavIconId } from '@/src/modules/portal/domain/types'

type SectionId =
  | 'panel'
  | 'invoices'
  | 'collections'
  | 'parties'
  | 'received'
  | 'issued'
  | 'incomeExpense'
  | 'journal'
  | 'ledger'
  | 'profitLoss'
  | 'balance'
  | 'summary'
  | 'settings'

/** Grupo del sidebar al que pertenece la sección. */
export type SectionNavGroup = 'billing' | 'accounting'

export type SectionDefinition = {
  id: SectionId
  /** Segmento de la URL bajo `/facturacion`. */
  slug: string
  navGroup: SectionNavGroup
  icon: NavIconId
  /** Muestra el selector de año y las cifras del periodo. */
  usesPeriod: boolean
  /** Muestra también los trimestres. */
  usesQuarter: boolean
}

const section = (
  id: SectionId,
  slug: string,
  navGroup: SectionNavGroup,
  icon: NavIconId,
  usesPeriod = true,
  usesQuarter = true
): SectionDefinition => ({ id, slug, navGroup, icon, usesPeriod, usesQuarter })

export const SECTIONS: readonly SectionDefinition[] = [
  section('panel', 'panel', 'billing', 'home'),
  section('invoices', 'facturas', 'billing', 'invoicing'),
  // Situación a hoy: no depende del periodo.
  section('collections', 'cobros-y-pagos', 'billing', 'cash', false, false),
  section('parties', 'clientes-y-proveedores', 'billing', 'contacts'),
  // Datos fiscales del emisor: ajustes, sin periodo.
  section('settings', 'configuracion', 'billing', 'settings', false, false),
  section('received', 'libro-recibidas', 'accounting', 'books'),
  section('issued', 'libro-emitidas', 'accounting', 'books'),
  section('incomeExpense', 'ingresos-y-gastos', 'accounting', 'cash'),
  section('journal', 'libro-diario', 'accounting', 'journal'),
  section('ledger', 'libro-mayor', 'accounting', 'ledger'),
  section('profitLoss', 'perdidas-y-ganancias', 'accounting', 'report'),
  section('balance', 'balance', 'accounting', 'balance'),
  // Siempre el año entero, trimestre a trimestre.
  section('summary', 'resumen-fiscal', 'accounting', 'tax', true, false),
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
