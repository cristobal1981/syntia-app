import { z } from 'zod'

import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import type { LeadReport } from '@/src/modules/leads/domain/types'

const leadEstadoSchema = z.enum(['pendiente', 'aceptado', 'rechazado', 'no_interesa'])

const segmentKeySchema = z.string()

const segmentBreakdownSchema = z.object({
  key: segmentKeySchema,
  totalLeads: z.number(),
  convertedCount: z.number(),
  conversionRatePct: z.number(),
})

/**
 * Valida la forma del `jsonb` devuelto por el RPC `get_lead_report` antes de
 * tratarlo como `LeadReport` — es la frontera real del sistema (SQL
 * arbitrario, no tipado por TypeScript), justo donde hace falta zod.
 */
const leadReportSchema = z.object({
  totalLeads: z.number(),
  funnel: z.array(
    z.object({ estado: leadEstadoSchema, count: z.number(), pct: z.number() })
  ),
  convertedAnywayByEstado: z.array(
    z.object({
      estado: leadEstadoSchema,
      totalLeads: z.number(),
      convertedCount: z.number(),
      convertedPct: z.number(),
    })
  ),
  byTipo: z.array(segmentBreakdownSchema),
  byResidencia: z.array(segmentBreakdownSchema),
  byCodigoCuota: z.array(segmentBreakdownSchema),
  byFacturacionBucket: z.array(segmentBreakdownSchema),
  lostAnnualValue: z.number(),
  lostAnnualValueByEstado: z.array(
    z.object({ estado: leadEstadoSchema, amount: z.number() })
  ),
  motivos: z.array(
    z.object({
      id: z.string(),
      nombre: z.string().nullable(),
      email: z.string().nullable(),
      estado: leadEstadoSchema,
      motivo: z.string(),
      createdAt: z.string(),
    })
  ),
  trend: z.array(z.object({ periodKey: z.string(), count: z.number() })),
  contactCandidates: z.array(
    z.object({
      id: z.string(),
      nombre: z.string().nullable(),
      email: z.string(),
      estado: leadEstadoSchema,
      totalMensual: z.number().nullable(),
      motivo: z.string().nullable(),
      lastContactedAt: z.string().nullable(),
    })
  ),
})

/**
 * Sustituye a `listLeads()` + `listLatestContactByLead()` +
 * `listConvertedOdooPartnerIds()` + `buildLeadReport()`: la agregación
 * (funnel, segmentos, valor perdido, tendencia, candidatos de contacto)
 * ahora vive en el RPC `get_lead_report` (ver
 * `supabase/migrations/20261005120000_lead_report_rpc.sql`) en vez de
 * traer las tablas completas a Node para agregar en memoria.
 */
export async function fetchLeadReport(): Promise<LeadReport> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('get_lead_report')

  if (error) {
    throw new Error(error.message)
  }

  return leadReportSchema.parse(data) as LeadReport
}
