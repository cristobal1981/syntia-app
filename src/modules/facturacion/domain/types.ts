import type { Issuer } from '@/src/modules/facturacion/domain/issuer'

export type InvoiceDirection = 'recibida' | 'emitida'

/** Impuesto indirecto: IGIC en Canarias, IVA en el resto. */
export type TaxRegime = 'igic' | 'iva'

/** Revisión por la asesoría: el cliente sube, la asesoría revisa y contabiliza. */
export type InvoiceReviewStatus = 'pendiente' | 'revisada'

export type InvoiceSource = 'manual' | 'pdf' | 'ejemplo'

/** Factura ordinaria o rectificativa de otra ya expedida (art. 15 del Reglamento de facturación). */
export type InvoiceKind = 'ordinaria' | 'rectificativa'

/**
 * `borrador`: aún sin número ni efecto contable. `definitiva`: expedida y contabilizada;
 * en las emitidas ya no se puede modificar (solo rectificar).
 */
type InvoiceStatus = 'borrador' | 'definitiva'

/** Todos los importes en céntimos (enteros) para no arrastrar errores de coma flotante. */
export type Invoice = {
  id: string
  direction: InvoiceDirection
  /** Vacío mientras sea un borrador: el número se asigna al expedirla. */
  invoiceNumber: string
  status: InvoiceStatus
  kind: InvoiceKind
  /** Serie de numeración (`F` facturas, `R` rectificativas); vacía en las recibidas. */
  series: string
  /** Número de orden dentro de la serie y el año; `null` en borradores y recibidas. */
  sequence: number | null
  /** Fecha de la factura, `YYYY-MM-DD`. */
  issueDate: string
  /** Fecha de vencimiento del pago, `YYYY-MM-DD`. */
  dueDate: string
  counterpartyName: string
  counterpartyTaxId: string
  /** Domicilio del tercero tal como figura en la factura (obligatorio al expedir una emitida). */
  counterpartyAddress: string
  concept: string
  categoryId: string
  regime: TaxRegime
  baseCents: number
  /** Porcentaje del impuesto (p. ej. 7 o 9.5). */
  taxRate: number
  taxCents: number
  /** Porcentaje de retención de IRPF (0 si no hay). */
  withholdingRate: number
  withholdingCents: number
  /** Base + impuesto − retención. */
  totalCents: number
  /** Parte del gasto que es deducible en IRPF (0–100); solo aplica a las recibidas. */
  deductiblePercent: number
  /** Fecha de pago (recibidas) o de cobro (emitidas); `null` si sigue pendiente. */
  paymentDate: string | null
  review: InvoiceReviewStatus
  /** Factura que rectifica esta (solo en rectificativas). */
  rectifies: string | null
  rectificationReason: string
  /** Momento exacto de la expedición (ISO); `null` mientras sea borrador. */
  issuedAt: string | null
  /** Datos del emisor congelados al expedir: cambiar los datos fiscales después no altera la factura. */
  issuer: Issuer | null
  /** Nombre y tipo del archivo adjunto (PDF o imagen). */
  pdfName: string | null
  attachmentMime: string | null
  source: InvoiceSource
  createdAt: string
}

export type InvoiceDraft = Omit<Invoice, 'id' | 'createdAt'>
