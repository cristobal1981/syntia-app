export type LeadEstado = 'pendiente' | 'aceptado' | 'rechazado' | 'no_interesa'
export type LeadTipo = 'ALTA' | 'CAMBIO'
export type LeadResidencia = 'Canarias' | 'Peninsula'
export type LeadCodigoCuota = 'TRAMO_30' | 'TRAMO_50' | 'TRAMO_90'

export type LeadRecord = {
  id: string
  odooPartnerId: number | null
  nombre: string | null
  email: string | null
  telefono: string | null
  tipo: LeadTipo | null
  residencia: LeadResidencia | null
  facturacionEstimada: number | null
  codigoCuota: LeadCodigoCuota | null
  totalMensual: number | null
  estado: LeadEstado
  motivo: string | null
  createdAt: string
}

/**
 * Tramos de facturación del informe; los cortes los calcula el RPC
 * `get_lead_report` y las etiquetas viven en `content/leads.ts`.
 */
type FacturacionBucketId =
  | 'lt_9600'
  | 'from_9600_to_12600'
  | 'from_12600_to_17000'
  | 'from_17000_to_50000'
  | 'gte_50000'

export type FunnelEntry = {
  estado: LeadEstado
  count: number
  pct: number
}

export type ConvertedAnywayEntry = {
  estado: LeadEstado
  totalLeads: number
  convertedCount: number
  convertedPct: number
}

export type SegmentKey<T extends string> = T | 'sin_dato'

export type SegmentBreakdown<T extends string> = {
  key: SegmentKey<T>
  totalLeads: number
  convertedCount: number
  conversionRatePct: number
}

export type LeadMotivoEntry = {
  id: string
  nombre: string | null
  email: string | null
  estado: LeadEstado
  motivo: string
  createdAt: string
}

export type LeadTrendPoint = {
  /** `YYYY-MM-DD` */
  periodKey: string
  count: number
}

export type LeadContactCandidate = {
  id: string
  nombre: string | null
  email: string
  estado: LeadEstado
  totalMensual: number | null
  motivo: string | null
  lastContactedAt: string | null
}

export type LeadReport = {
  totalLeads: number
  funnel: FunnelEntry[]
  convertedAnywayByEstado: ConvertedAnywayEntry[]
  byTipo: SegmentBreakdown<LeadTipo>[]
  byResidencia: SegmentBreakdown<LeadResidencia>[]
  byCodigoCuota: SegmentBreakdown<LeadCodigoCuota>[]
  byFacturacionBucket: SegmentBreakdown<FacturacionBucketId>[]
  lostAnnualValue: number
  lostAnnualValueByEstado: { estado: LeadEstado; amount: number }[]
  motivos: LeadMotivoEntry[]
  trend: LeadTrendPoint[]
  contactCandidates: LeadContactCandidate[]
}
