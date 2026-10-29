import type { ClientKind, Territory } from '@/src/modules/facturacion/domain/tax-profile'
import type { Issuer } from '@/src/modules/facturacion/domain/issuer'

/** Impuesto indirecto: IGIC en Canarias, IVA en el resto. */
export type TaxRegime = 'igic' | 'iva'

/** Revisión por la asesoría: el cliente sube, la asesoría revisa y contabiliza. */
export type InvoiceReviewStatus = 'pendiente' | 'revisada'

export type InvoiceSource = 'manual' | 'ejemplo'

/** Forma de cobro que figura en la factura. */
export type PaymentMethod = 'transferencia' | 'contado' | 'tarjeta' | 'domiciliacion'

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['transferencia', 'contado', 'tarjeta', 'domiciliacion']

export const DEFAULT_PAYMENT_METHOD: PaymentMethod = 'transferencia'

/** Factura ordinaria o rectificativa de otra ya expedida (art. 15 del Reglamento de facturación). */
export type InvoiceKind = 'ordinaria' | 'rectificativa'

/**
 * `borrador`: aún sin número ni efecto contable. `definitiva`: expedida; ya no se
 * puede modificar (solo rectificar).
 */
type InvoiceStatus = 'borrador' | 'definitiva'

/** Una línea de la factura: producto o servicio, cantidad y precio unitario sin impuestos. */
export type InvoiceLine = {
  id: string
  description: string
  quantity: number
  unitPriceCents: number
}

/** Todos los importes en céntimos (enteros) para no arrastrar errores de coma flotante. */
export type Invoice = {
  id: string
  /** Vacío mientras sea un borrador: el número se asigna al expedirla. */
  invoiceNumber: string
  status: InvoiceStatus
  kind: InvoiceKind
  /** Serie de numeración (`F` facturas, `R` rectificativas). */
  series: string
  /** Número de orden dentro de la serie y el año; `null` en borradores. */
  sequence: number | null
  /** Fecha de la factura, `YYYY-MM-DD`. */
  issueDate: string
  /** Fecha de vencimiento del pago, `YYYY-MM-DD`. */
  dueDate: string
  counterpartyName: string
  counterpartyTaxId: string
  /** Domicilio del cliente tal como figura en la factura (obligatorio al expedir). */
  counterpartyAddress: string
  /** Dónde está establecido el cliente y cómo actúa: de eso salen el impuesto y la retención. */
  counterpartyTerritory: Territory
  counterpartyKind: ClientKind
  /** Resumen de las líneas, para listas y búsquedas. */
  concept: string
  lines: InvoiceLine[]
  categoryId: string
  regime: TaxRegime
  /** Suma de las líneas. */
  baseCents: number
  /** Porcentaje del impuesto (p. ej. 7 o 9.5). */
  taxRate: number
  taxCents: number
  /** Porcentaje de retención de IRPF (0 si no hay). */
  withholdingRate: number
  withholdingCents: number
  /** Leyenda cuando no hay impuesto (no sujeta o exenta); vacía si la operación está sujeta. */
  taxNote: string
  /** Base + impuesto − retención. */
  totalCents: number
  /** Motivo de una fecha anterior a hoy; vacío si la fecha no es pasada. */
  dateReason: string
  paymentMethod: PaymentMethod
  /** Fecha de cobro; `null` si sigue pendiente. */
  paymentDate: string | null
  review: InvoiceReviewStatus
  /** Factura que rectifica esta (solo en rectificativas). */
  rectifies: string | null
  rectificationReason: string
  /** Momento exacto de la expedición (ISO); `null` mientras sea borrador. */
  issuedAt: string | null
  /** Datos del emisor congelados al expedir: cambiar los datos fiscales después no altera la factura. */
  issuer: Issuer | null
  source: InvoiceSource
  createdAt: string
}

export type InvoiceDraft = Omit<Invoice, 'id' | 'createdAt'>
