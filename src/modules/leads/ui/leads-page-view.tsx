import { leads as leadsCopy } from '@/content/leads'
import type { LeadReport } from '@/src/modules/leads/domain/types'
import { LeadsContactList } from '@/src/modules/leads/ui/leads-contact-list'
import { LeadsConvertedAnywayCard } from '@/src/modules/leads/ui/leads-converted-anyway-card'
import { LeadsFunnelBar } from '@/src/modules/leads/ui/leads-funnel-bar'
import { LeadsKpiTiles } from '@/src/modules/leads/ui/leads-kpi-tiles'
import { LeadsMotivosList } from '@/src/modules/leads/ui/leads-motivos-list'
import { LeadsSegmentBreakdown } from '@/src/modules/leads/ui/leads-segment-breakdown'
import { LeadsTrendChart } from '@/src/modules/leads/ui/leads-trend-chart'

type LeadsPageViewProps = {
  report: LeadReport
}

export function LeadsPageView({ report }: LeadsPageViewProps) {
  const copy = leadsCopy
  const overallConvertedCount = report.convertedAnywayByEstado.reduce(
    (sum, entry) => sum + entry.convertedCount,
    0
  )
  const overallConversionPct =
    report.totalLeads > 0 ? (overallConvertedCount / report.totalLeads) * 100 : 0

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{copy.description}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          {report.totalLeads} {copy.countLabel}
        </p>
      </header>

      {report.totalLeads === 0 ? (
        <div className="portal-home-card rounded-2xl px-6 py-12 text-center">
          <h2 className="font-sans text-lg font-semibold text-foreground">
            {copy.emptyTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{copy.emptyDescription}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <LeadsKpiTiles
            totalLeads={report.totalLeads}
            overallConversionPct={overallConversionPct}
            lostAnnualValue={report.lostAnnualValue}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <LeadsFunnelBar funnel={report.funnel} />
            <LeadsConvertedAnywayCard entries={report.convertedAnywayByEstado} />
          </div>

          <div className="portal-home-card rounded-xl p-5">
            <h2 className="font-sans text-base font-semibold text-foreground">
              {copy.segments.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{copy.segments.description}</p>
            <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
              <LeadsSegmentBreakdown
                title={copy.segments.tipo.title}
                entries={report.byTipo}
                labelFor={(key) =>
                  key === 'sin_dato' ? copy.segments.sinDato : copy.segments.tipo.labels[key]
                }
              />
              <LeadsSegmentBreakdown
                title={copy.segments.residencia.title}
                entries={report.byResidencia}
                labelFor={(key) =>
                  key === 'sin_dato'
                    ? copy.segments.sinDato
                    : copy.segments.residencia.labels[key]
                }
              />
              <LeadsSegmentBreakdown
                title={copy.segments.codigoCuota.title}
                entries={report.byCodigoCuota}
                labelFor={(key) =>
                  key === 'sin_dato'
                    ? copy.segments.sinDato
                    : copy.segments.codigoCuota.labels[key]
                }
              />
              <LeadsSegmentBreakdown
                title={copy.segments.facturacion.title}
                entries={report.byFacturacionBucket}
                labelFor={(key) =>
                  key === 'sin_dato'
                    ? copy.segments.sinDato
                    : copy.segments.facturacion.bucketLabels[key]
                }
              />
            </div>
          </div>

          <LeadsTrendChart trend={report.trend} />

          <LeadsMotivosList motivos={report.motivos} />

          <LeadsContactList candidates={report.contactCandidates} />
        </div>
      )}
    </div>
  )
}
