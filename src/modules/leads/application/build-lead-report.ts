import {
  LEAD_ESTADOS,
  bucketFacturacion,
  type ConvertedAnywayEntry,
  type FacturacionBucketId,
  type FunnelEntry,
  type LeadCodigoCuota,
  type LeadContactCandidate,
  type LeadEstado,
  type LeadMotivoEntry,
  type LeadRecord,
  type LeadReport,
  type LeadResidencia,
  type LeadTipo,
  type LeadTrendPoint,
  type SegmentBreakdown,
} from '@/src/modules/leads/domain/types'

/** Estados en los que ya hubo una decisión (o un sí que se quedó a medias) — se excluye `pendiente`. */
const CONTACTABLE_ESTADOS = new Set<LeadEstado>(['aceptado', 'rechazado', 'no_interesa'])

function pct(part: number, total: number): number {
  return total > 0 ? (part / total) * 100 : 0
}

function isConverted(lead: LeadRecord, convertedPartnerIds: Set<number>): boolean {
  return lead.odooPartnerId != null && convertedPartnerIds.has(lead.odooPartnerId)
}

function buildFunnel(leads: LeadRecord[]): FunnelEntry[] {
  const total = leads.length
  return LEAD_ESTADOS.map((estado) => {
    const count = leads.filter((lead) => lead.estado === estado).length
    return { estado, count, pct: pct(count, total) }
  })
}

function buildConvertedAnywayByEstado(
  leads: LeadRecord[],
  convertedPartnerIds: Set<number>
): ConvertedAnywayEntry[] {
  return LEAD_ESTADOS.map((estado) => {
    const leadsInEstado = leads.filter((lead) => lead.estado === estado)
    const convertedCount = leadsInEstado.filter((lead) =>
      isConverted(lead, convertedPartnerIds)
    ).length
    return {
      estado,
      totalLeads: leadsInEstado.length,
      convertedCount,
      convertedPct: pct(convertedCount, leadsInEstado.length),
    }
  })
}

function buildSegmentBreakdown<T extends string>(
  leads: LeadRecord[],
  convertedPartnerIds: Set<number>,
  resolveKey: (lead: LeadRecord) => T | null
): SegmentBreakdown<T>[] {
  const groups = new Map<T | 'sin_dato', LeadRecord[]>()
  for (const lead of leads) {
    const key = resolveKey(lead) ?? 'sin_dato'
    const group = groups.get(key)
    if (group) group.push(lead)
    else groups.set(key, [lead])
  }

  return Array.from(groups.entries())
    .map(([key, groupLeads]) => {
      const convertedCount = groupLeads.filter((lead) =>
        isConverted(lead, convertedPartnerIds)
      ).length
      return {
        key,
        totalLeads: groupLeads.length,
        convertedCount,
        conversionRatePct: pct(convertedCount, groupLeads.length),
      }
    })
    .sort((a, b) => b.totalLeads - a.totalLeads)
}

function buildLostAnnualValue(
  leads: LeadRecord[],
  convertedPartnerIds: Set<number>
): { total: number; byEstado: { estado: LeadEstado; amount: number }[] } {
  const notConverted = leads.filter((lead) => !isConverted(lead, convertedPartnerIds))
  const amountOf = (lead: LeadRecord) => (lead.totalMensual ?? 0) * 12

  const byEstado = LEAD_ESTADOS.map((estado) => ({
    estado,
    amount: notConverted
      .filter((lead) => lead.estado === estado)
      .reduce((sum, lead) => sum + amountOf(lead), 0),
  }))

  return {
    total: notConverted.reduce((sum, lead) => sum + amountOf(lead), 0),
    byEstado,
  }
}

function buildMotivos(leads: LeadRecord[]): LeadMotivoEntry[] {
  return leads
    .map((lead) => ({ lead, motivo: lead.motivo?.trim() ?? '' }))
    .filter((entry) => entry.motivo.length > 0)
    .map(({ lead, motivo }) => ({
      id: lead.id,
      nombre: lead.nombre,
      email: lead.email,
      estado: lead.estado,
      motivo,
      createdAt: lead.createdAt,
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function buildTrend(leads: LeadRecord[]): LeadTrendPoint[] {
  const counts = new Map<string, number>()
  for (const lead of leads) {
    const day = lead.createdAt.slice(0, 10)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([periodKey, count]) => ({ periodKey, count }))
    .sort((a, b) => a.periodKey.localeCompare(b.periodKey))
}

function buildContactCandidates(
  leads: LeadRecord[],
  convertedPartnerIds: Set<number>,
  lastContactByLead: Map<string, string>
): LeadContactCandidate[] {
  return leads
    .filter(
      (lead) =>
        lead.email != null &&
        CONTACTABLE_ESTADOS.has(lead.estado) &&
        !isConverted(lead, convertedPartnerIds)
    )
    .map((lead) => ({
      id: lead.id,
      nombre: lead.nombre,
      // el filtro de arriba ya garantiza email no nulo
      email: lead.email as string,
      estado: lead.estado,
      totalMensual: lead.totalMensual,
      motivo: lead.motivo,
      lastContactedAt: lastContactByLead.get(lead.id) ?? null,
    }))
    .sort((a, b) => (b.totalMensual ?? -1) - (a.totalMensual ?? -1))
}

export function buildLeadReport(
  leads: LeadRecord[],
  convertedPartnerIds: Set<number>,
  lastContactByLead: Map<string, string> = new Map()
): LeadReport {
  const lostAnnualValue = buildLostAnnualValue(leads, convertedPartnerIds)

  return {
    totalLeads: leads.length,
    funnel: buildFunnel(leads),
    convertedAnywayByEstado: buildConvertedAnywayByEstado(leads, convertedPartnerIds),
    byTipo: buildSegmentBreakdown<LeadTipo>(leads, convertedPartnerIds, (lead) => lead.tipo),
    byResidencia: buildSegmentBreakdown<LeadResidencia>(
      leads,
      convertedPartnerIds,
      (lead) => lead.residencia
    ),
    byCodigoCuota: buildSegmentBreakdown<LeadCodigoCuota>(
      leads,
      convertedPartnerIds,
      (lead) => lead.codigoCuota
    ),
    byFacturacionBucket: buildSegmentBreakdown<FacturacionBucketId>(
      leads,
      convertedPartnerIds,
      (lead) => bucketFacturacion(lead.facturacionEstimada)
    ),
    lostAnnualValue: lostAnnualValue.total,
    lostAnnualValueByEstado: lostAnnualValue.byEstado,
    motivos: buildMotivos(leads),
    trend: buildTrend(leads),
    contactCandidates: buildContactCandidates(leads, convertedPartnerIds, lastContactByLead),
  }
}
