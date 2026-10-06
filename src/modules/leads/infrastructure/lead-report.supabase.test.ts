import { describe, expect, it, vi, beforeEach } from 'vitest'

const { createSupabaseAdminClient, rpc } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

import { fetchLeadReport } from '@/src/modules/leads/infrastructure/lead-report.supabase'

beforeEach(() => {
  vi.resetAllMocks()
  createSupabaseAdminClient.mockReturnValue({ rpc })
})

function emptyReportPayload() {
  return {
    totalLeads: 0,
    funnel: [],
    convertedAnywayByEstado: [],
    byTipo: [],
    byResidencia: [],
    byCodigoCuota: [],
    byFacturacionBucket: [],
    lostAnnualValue: 0,
    lostAnnualValueByEstado: [],
    motivos: [],
    trend: [],
    contactCandidates: [],
  }
}

describe('fetchLeadReport', () => {
  it('llama al RPC get_lead_report sin parámetros', async () => {
    rpc.mockResolvedValue({ data: emptyReportPayload(), error: null })

    await fetchLeadReport()

    expect(rpc).toHaveBeenCalledWith('get_lead_report')
  })

  it('devuelve el reporte validado cuando el RPC responde con la forma esperada', async () => {
    const payload = {
      ...emptyReportPayload(),
      totalLeads: 1,
      funnel: [{ estado: 'pendiente', count: 1, pct: 100 }],
      contactCandidates: [
        {
          id: 'lead-1',
          nombre: 'Ana',
          email: 'ana@example.com',
          estado: 'aceptado',
          totalMensual: 100,
          motivo: null,
          lastContactedAt: null,
        },
      ],
    }
    rpc.mockResolvedValue({ data: payload, error: null })

    const result = await fetchLeadReport()

    expect(result.totalLeads).toBe(1)
    expect(result.contactCandidates).toHaveLength(1)
  })

  it('lanza un Error con el mensaje de Supabase si el RPC falla', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom' } })

    await expect(fetchLeadReport()).rejects.toThrow('boom')
  })

  it('rechaza una respuesta que no cumple la forma esperada en vez de devolverla tal cual', async () => {
    rpc.mockResolvedValue({ data: { totalLeads: 'no-es-un-numero' }, error: null })

    await expect(fetchLeadReport()).rejects.toThrow()
  })
})
