import type { InvoiceDirection } from '@/src/modules/facturacion/domain/types'

export type InvoiceCategory = {
  id: string
  direction: InvoiceDirection
  label: string
  /** Cuenta del Plan General Contable donde se anota el gasto o el ingreso. */
  account: string
  accountName: string
  /** Cuenta del tercero: proveedores o acreedores (recibidas); clientes (emitidas). */
  counterpartyAccount: string
  counterpartyAccountName: string
}

const PROVEEDORES = { account: '400', name: 'Proveedores' }
const ACREEDORES = { account: '410', name: 'Acreedores por prestaciones de servicios' }

function expense(
  id: string,
  label: string,
  account: string,
  accountName: string,
  creditor = ACREEDORES
): InvoiceCategory {
  return {
    id,
    direction: 'recibida',
    label,
    account,
    accountName,
    counterpartyAccount: creditor.account,
    counterpartyAccountName: creditor.name,
  }
}

function income(id: string, label: string, account: string, accountName: string): InvoiceCategory {
  return {
    id,
    direction: 'emitida',
    label,
    account,
    accountName,
    counterpartyAccount: '430',
    counterpartyAccountName: 'Clientes',
  }
}

const INVOICE_CATEGORIES: readonly InvoiceCategory[] = [
  expense('compras', 'Compras de mercaderías', '600', 'Compras de mercaderías', PROVEEDORES),
  expense('material', 'Material y aprovisionamientos', '602', 'Compras de otros aprovisionamientos', PROVEEDORES),
  expense('alquiler', 'Alquileres', '621', 'Arrendamientos y cánones'),
  expense('reparaciones', 'Reparaciones y mantenimiento', '622', 'Reparaciones y conservación'),
  expense('profesionales', 'Servicios profesionales', '623', 'Servicios de profesionales independientes'),
  expense('transporte', 'Transportes', '624', 'Transportes'),
  expense('seguros', 'Seguros', '625', 'Primas de seguros'),
  expense('bancarios', 'Servicios bancarios', '626', 'Servicios bancarios y similares'),
  expense('publicidad', 'Publicidad y marketing', '627', 'Publicidad, propaganda y relaciones públicas'),
  expense('suministros', 'Suministros (luz, agua, internet)', '628', 'Suministros'),
  expense('otros-servicios', 'Otros servicios', '629', 'Otros servicios'),
  income('ventas', 'Venta de productos', '700', 'Ventas de mercaderías'),
  income('servicios', 'Prestación de servicios', '705', 'Prestaciones de servicios'),
]

export const DEFAULT_CATEGORY_ID: Record<InvoiceDirection, string> = {
  recibida: 'otros-servicios',
  emitida: 'servicios',
}

export function categoriesFor(direction: InvoiceDirection): InvoiceCategory[] {
  return INVOICE_CATEGORIES.filter((category) => category.direction === direction)
}

/** Si la categoría no existe (dato antiguo) se cae a la genérica de la dirección. */
export function getCategory(id: string, direction: InvoiceDirection): InvoiceCategory {
  return (
    INVOICE_CATEGORIES.find((category) => category.id === id && category.direction === direction) ??
    INVOICE_CATEGORIES.find((category) => category.id === DEFAULT_CATEGORY_ID[direction])!
  )
}
