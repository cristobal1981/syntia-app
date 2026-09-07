import { describe, expect, it } from 'vitest'

import { buildLeadReport } from '@/src/modules/leads/application/build-lead-report'
import type { LeadRecord } from '@/src/modules/leads/domain/types'

function lead(overrides: Partial<LeadRecord> = {}): LeadRecord {
  return {
    id: 'lead-1',
    odooPartnerId: null,
    nombre: 'Nombre Apellido',
    email: 'lead@example.com',
    telefono: null,
    tipo: 'ALTA',
    residencia: 'Peninsula',
    facturacionEstimada: 15_000,
    codigoCuota: 'TRAMO_50',
    totalMensual: 100,
    estado: 'pendiente',
    motivo: null,
    createdAt: '2026-01-15T10:00:00.000Z',
    ...overrides,
  }
}

describe('buildLeadReport — caso vacío', () => {
  it('no produce NaN/Infinity en ningún porcentaje y devuelve arrays vacíos', () => {
    const report = buildLeadReport([], new Set())

    expect(report.totalLeads).toBe(0)
    expect(report.lostAnnualValue).toBe(0)
    expect(report.motivos).toEqual([])
    expect(report.trend).toEqual([])
    expect(report.byTipo).toEqual([])

    for (const entry of report.funnel) {
      expect(entry.pct).toBe(0)
      expect(Number.isFinite(entry.pct)).toBe(true)
    }
    for (const entry of report.convertedAnywayByEstado) {
      expect(entry.convertedPct).toBe(0)
      expect(Number.isFinite(entry.convertedPct)).toBe(true)
    }
  })
})

describe('buildLeadReport — señal de conversión real (odoo_partner_id ↔ client_integrations)', () => {
  it('un odoo_partner_id null nunca cuenta como convertido, sea cual sea el set', () => {
    const leads = [lead({ id: 'a', odooPartnerId: null, estado: 'aceptado' })]
    const report = buildLeadReport(leads, new Set([1, 2, 3]))

    const aceptado = report.convertedAnywayByEstado.find((e) => e.estado === 'aceptado')
    expect(aceptado?.convertedCount).toBe(0)
  })

  it('un odoo_partner_id presente pero fuera del set de convertidos no cuenta como convertido', () => {
    const leads = [lead({ id: 'a', odooPartnerId: 42, estado: 'rechazado' })]
    const report = buildLeadReport(leads, new Set([1, 2, 3]))

    const rechazado = report.convertedAnywayByEstado.find((e) => e.estado === 'rechazado')
    expect(rechazado?.convertedCount).toBe(0)
  })

  it('ids duplicados entre leads no se cuentan dos veces ni se cruzan entre sí', () => {
    const leads = [
      lead({ id: 'a', odooPartnerId: 99, estado: 'rechazado' }),
      lead({ id: 'b', odooPartnerId: 99, estado: 'no_interesa' }),
    ]
    const report = buildLeadReport(leads, new Set([99]))

    const rechazado = report.convertedAnywayByEstado.find((e) => e.estado === 'rechazado')
    const noInteresa = report.convertedAnywayByEstado.find((e) => e.estado === 'no_interesa')
    expect(rechazado?.convertedCount).toBe(1)
    expect(rechazado?.totalLeads).toBe(1)
    expect(noInteresa?.convertedCount).toBe(1)
    expect(noInteresa?.totalLeads).toBe(1)
  })

  it('EL HALLAZGO CENTRAL: un lead "rechazado" que sí aparece en client_integrations se marca como convertido', () => {
    const leads = [lead({ odooPartnerId: 7, estado: 'rechazado' })]
    const report = buildLeadReport(leads, new Set([7]))

    const rechazado = report.convertedAnywayByEstado.find((e) => e.estado === 'rechazado')
    expect(rechazado).toEqual({
      estado: 'rechazado',
      totalLeads: 1,
      convertedCount: 1,
      convertedPct: 100,
    })
  })

  it('un lead "aceptado" que NUNCA llegó a client_integrations se refleja como no convertido', () => {
    const leads = [lead({ odooPartnerId: 8, estado: 'aceptado' })]
    const report = buildLeadReport(leads, new Set([]))

    const aceptado = report.convertedAnywayByEstado.find((e) => e.estado === 'aceptado')
    expect(aceptado).toEqual({
      estado: 'aceptado',
      totalLeads: 1,
      convertedCount: 0,
      convertedPct: 0,
    })
  })

  it('un estado sin ningún lead aparece con totalLeads 0 y convertedPct 0 (no NaN)', () => {
    const leads = [lead({ estado: 'pendiente' })]
    const report = buildLeadReport(leads, new Set())

    const aceptado = report.convertedAnywayByEstado.find((e) => e.estado === 'aceptado')
    expect(aceptado).toEqual({
      estado: 'aceptado',
      totalLeads: 0,
      convertedCount: 0,
      convertedPct: 0,
    })
  })
})

describe('buildLeadReport — funnel', () => {
  it('cuenta y calcula el % correcto por estado sobre el total', () => {
    const leads = [
      lead({ id: '1', estado: 'pendiente' }),
      lead({ id: '2', estado: 'pendiente' }),
      lead({ id: '3', estado: 'aceptado' }),
      lead({ id: '4', estado: 'rechazado' }),
    ]
    const report = buildLeadReport(leads, new Set())

    const pendiente = report.funnel.find((e) => e.estado === 'pendiente')
    const aceptado = report.funnel.find((e) => e.estado === 'aceptado')
    const noInteresa = report.funnel.find((e) => e.estado === 'no_interesa')

    expect(pendiente).toEqual({ estado: 'pendiente', count: 2, pct: 50 })
    expect(aceptado).toEqual({ estado: 'aceptado', count: 1, pct: 25 })
    expect(noInteresa).toEqual({ estado: 'no_interesa', count: 0, pct: 0 })
  })
})

describe('buildLeadReport — segmentos (tipo/residencia/codigoCuota)', () => {
  it('agrupa un valor null bajo la clave "sin_dato" sin perder el lead', () => {
    const leads = [lead({ tipo: null })]
    const report = buildLeadReport(leads, new Set())

    expect(report.byTipo).toEqual([
      { key: 'sin_dato', totalLeads: 1, convertedCount: 0, conversionRatePct: 0 },
    ])
  })

  it('un "sin_dato" no contamina el conteo de los grupos con dato', () => {
    const leads = [
      lead({ id: '1', tipo: 'ALTA' }),
      lead({ id: '2', tipo: null }),
      lead({ id: '3', tipo: 'CAMBIO' }),
    ]
    const report = buildLeadReport(leads, new Set())

    const alta = report.byTipo.find((e) => e.key === 'ALTA')
    const cambio = report.byTipo.find((e) => e.key === 'CAMBIO')
    const sinDato = report.byTipo.find((e) => e.key === 'sin_dato')

    expect(alta?.totalLeads).toBe(1)
    expect(cambio?.totalLeads).toBe(1)
    expect(sinDato?.totalLeads).toBe(1)
  })

  it('calcula la tasa de conversión por segmento usando la misma señal de client_integrations', () => {
    const leads = [
      lead({ id: '1', tipo: 'ALTA', odooPartnerId: 1 }),
      lead({ id: '2', tipo: 'ALTA', odooPartnerId: 2 }),
    ]
    const report = buildLeadReport(leads, new Set([1]))

    const alta = report.byTipo.find((e) => e.key === 'ALTA')
    expect(alta).toEqual({ key: 'ALTA', totalLeads: 2, convertedCount: 1, conversionRatePct: 50 })
  })
})

describe('buildLeadReport — bucket de facturación', () => {
  it('facturacion_estimada null cae en "sin_dato", no se descarta', () => {
    const leads = [lead({ facturacionEstimada: null })]
    const report = buildLeadReport(leads, new Set())

    expect(report.byFacturacionBucket).toEqual([
      { key: 'sin_dato', totalLeads: 1, convertedCount: 0, conversionRatePct: 0 },
    ])
  })

  it('un valor exactamente en el límite (9600) cae en el bucket superior — corte [min, max)', () => {
    const leads = [lead({ facturacionEstimada: 9_600 })]
    const report = buildLeadReport(leads, new Set())

    expect(report.byFacturacionBucket).toEqual([
      {
        key: 'from_9600_to_12600',
        totalLeads: 1,
        convertedCount: 0,
        conversionRatePct: 0,
      },
    ])
  })

  it('un valor justo por debajo del límite cae en el bucket inferior', () => {
    const leads = [lead({ facturacionEstimada: 9_599.99 })]
    const report = buildLeadReport(leads, new Set())

    expect(report.byFacturacionBucket).toEqual([
      { key: 'lt_9600', totalLeads: 1, convertedCount: 0, conversionRatePct: 0 },
    ])
  })

  it('el bucket más alto no tiene tope superior', () => {
    const leads = [lead({ facturacionEstimada: 1_000_000 })]
    const report = buildLeadReport(leads, new Set())

    expect(report.byFacturacionBucket[0].key).toBe('gte_50000')
  })
})

describe('buildLeadReport — valor anual perdido (KPI en €)', () => {
  it('total_mensual null se trata como 0, no rompe la suma', () => {
    const leads = [lead({ totalMensual: null, estado: 'rechazado' })]
    const report = buildLeadReport(leads, new Set())

    expect(report.lostAnnualValue).toBe(0)
    expect(Number.isNaN(report.lostAnnualValue)).toBe(false)
  })

  it('suma total_mensual*12 solo de los leads NO convertidos', () => {
    const leads = [
      lead({ id: '1', totalMensual: 100, estado: 'rechazado', odooPartnerId: null }),
      lead({ id: '2', totalMensual: 200, estado: 'rechazado', odooPartnerId: 5 }),
    ]
    const report = buildLeadReport(leads, new Set([5]))

    // El lead 2 SÍ convirtió (odoo_partner_id=5 está en el set) → no cuenta como perdido.
    expect(report.lostAnnualValue).toBe(100 * 12)
  })

  it('desglosa el valor perdido por estado', () => {
    const leads = [
      lead({ id: '1', totalMensual: 100, estado: 'rechazado' }),
      lead({ id: '2', totalMensual: 50, estado: 'no_interesa' }),
    ]
    const report = buildLeadReport(leads, new Set())

    const rechazado = report.lostAnnualValueByEstado.find((e) => e.estado === 'rechazado')
    const noInteresa = report.lostAnnualValueByEstado.find((e) => e.estado === 'no_interesa')
    expect(rechazado?.amount).toBe(1_200)
    expect(noInteresa?.amount).toBe(600)
  })
})

describe('buildLeadReport — motivos', () => {
  it('excluye motivo null, vacío o solo-espacios del listado', () => {
    const leads = [
      lead({ id: '1', motivo: null }),
      lead({ id: '2', motivo: '' }),
      lead({ id: '3', motivo: '   ' }),
      lead({ id: '4', motivo: 'Le pareció caro' }),
    ]
    const report = buildLeadReport(leads, new Set())

    expect(report.motivos).toHaveLength(1)
    expect(report.motivos[0].motivo).toBe('Le pareció caro')
  })

  it('recorta espacios y ordena por fecha descendente (más reciente primero)', () => {
    const leads = [
      lead({ id: '1', motivo: '  Precio  ', createdAt: '2026-01-01T00:00:00.000Z' }),
      lead({ id: '2', motivo: 'No confía', createdAt: '2026-02-01T00:00:00.000Z' }),
    ]
    const report = buildLeadReport(leads, new Set())

    expect(report.motivos.map((m) => m.motivo)).toEqual(['No confía', 'Precio'])
  })
})

describe('buildLeadReport — tendencia', () => {
  it('agrupa por día (YYYY-MM-DD) y ordena ascendente', () => {
    const leads = [
      lead({ id: '1', createdAt: '2026-02-01T23:00:00.000Z' }),
      lead({ id: '2', createdAt: '2026-01-01T05:00:00.000Z' }),
      lead({ id: '3', createdAt: '2026-01-01T09:00:00.000Z' }),
    ]
    const report = buildLeadReport(leads, new Set())

    expect(report.trend).toEqual([
      { periodKey: '2026-01-01', count: 2 },
      { periodKey: '2026-02-01', count: 1 },
    ])
  })
})

describe('buildLeadReport — candidatos a contactar', () => {
  it('excluye a los ya convertidos (misma señal de client_integrations)', () => {
    const leads = [
      lead({ id: '1', estado: 'rechazado', odooPartnerId: 5 }),
      lead({ id: '2', estado: 'rechazado', odooPartnerId: null }),
    ]
    const report = buildLeadReport(leads, new Set([5]))

    expect(report.contactCandidates.map((c) => c.id)).toEqual(['2'])
  })

  it('excluye leads sin email', () => {
    const leads = [lead({ estado: 'rechazado', email: null })]
    const report = buildLeadReport(leads, new Set())

    expect(report.contactCandidates).toEqual([])
  })

  it('excluye "pendiente" — todavía no ha tomado ninguna decisión', () => {
    const leads = [lead({ estado: 'pendiente' })]
    const report = buildLeadReport(leads, new Set())

    expect(report.contactCandidates).toEqual([])
  })

  it('incluye "aceptado" que no llegó a convertirse — el más urgente', () => {
    const leads = [lead({ estado: 'aceptado', odooPartnerId: null })]
    const report = buildLeadReport(leads, new Set())

    expect(report.contactCandidates).toHaveLength(1)
    expect(report.contactCandidates[0].estado).toBe('aceptado')
  })

  it('ordena por total_mensual descendente, con los null al final', () => {
    const leads = [
      lead({ id: 'low', estado: 'rechazado', totalMensual: 50 }),
      lead({ id: 'null', estado: 'rechazado', totalMensual: null }),
      lead({ id: 'high', estado: 'rechazado', totalMensual: 200 }),
    ]
    const report = buildLeadReport(leads, new Set())

    expect(report.contactCandidates.map((c) => c.id)).toEqual(['high', 'low', 'null'])
  })

  it('propaga lastContactedAt desde el mapa cuando existe, null cuando no', () => {
    const leads = [
      lead({ id: 'contacted', estado: 'rechazado' }),
      lead({ id: 'never', estado: 'rechazado' }),
    ]
    const report = buildLeadReport(
      leads,
      new Set(),
      new Map([['contacted', '2026-01-01T00:00:00.000Z']])
    )

    const contacted = report.contactCandidates.find((c) => c.id === 'contacted')
    const never = report.contactCandidates.find((c) => c.id === 'never')
    expect(contacted?.lastContactedAt).toBe('2026-01-01T00:00:00.000Z')
    expect(never?.lastContactedAt).toBeNull()
  })

  it('sin mapa de contactos (parámetro omitido), todos quedan sin contactar', () => {
    const leads = [lead({ estado: 'no_interesa' })]
    const report = buildLeadReport(leads, new Set())

    expect(report.contactCandidates[0].lastContactedAt).toBeNull()
  })
})
