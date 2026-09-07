import { describe, expect, it, vi, beforeEach } from 'vitest'

import { getLeadById, listLeads, mapLeadRow } from '@/src/modules/leads/infrastructure/leads.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

beforeEach(() => {
  vi.resetAllMocks()
})

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    odoo_partner_id: 42,
    nombre: 'Ana',
    email: 'ana@example.com',
    telefono: null,
    tipo: 'ALTA',
    residencia: 'Peninsula',
    facturacion_estimada: 15_000,
    codigo_cuota: 'TRAMO_50',
    total_mensual: 100,
    estado: 'pendiente',
    motivo: null,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('listLeads', () => {
  it('ordena por created_at descendente y mapea las filas', async () => {
    const order = vi.fn().mockResolvedValue({ data: [row()], error: null })
    const select = vi.fn().mockReturnValue({ order })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select }),
    })

    const result = await listLeads()

    expect(order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('lead-1')
  })

  it('lanza un Error con el mensaje de Supabase si la query falla', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ order }) }),
    })

    await expect(listLeads()).rejects.toThrow('boom')
  })
})

describe('getLeadById', () => {
  it('filtra por id y devuelve el lead mapeado', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: row(), error: null })
    const eq = vi.fn().mockReturnValue({ maybeSingle })
    const select = vi.fn().mockReturnValue({ eq })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select }),
    })

    const result = await getLeadById('lead-1')

    expect(eq).toHaveBeenCalledWith('id', 'lead-1')
    expect(result?.id).toBe('lead-1')
  })

  it('devuelve null cuando no existe', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }),
      }),
    })

    await expect(getLeadById('missing')).resolves.toBeNull()
  })

  it('lanza un Error con el mensaje de Supabase si la query falla', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ maybeSingle }) }),
      }),
    })

    await expect(getLeadById('lead-1')).rejects.toThrow('boom')
  })
})

describe('mapLeadRow', () => {
  it('convierte snake_case a camelCase', () => {
    const mapped = mapLeadRow(row())

    expect(mapped).toEqual({
      id: 'lead-1',
      odooPartnerId: 42,
      nombre: 'Ana',
      email: 'ana@example.com',
      telefono: null,
      tipo: 'ALTA',
      residencia: 'Peninsula',
      facturacionEstimada: 15_000,
      codigoCuota: 'TRAMO_50',
      totalMensual: 100,
      estado: 'pendiente',
      motivo: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })

  it('descarta un valor de enum desconocido (columna corrupta) en vez de propagarlo', () => {
    const mapped = mapLeadRow(row({ tipo: 'ALGO_INVENTADO', codigo_cuota: 'OTRO' }))

    expect(mapped.tipo).toBeNull()
    expect(mapped.codigoCuota).toBeNull()
  })

  it('un estado desconocido cae a "pendiente" en vez de romper el tipado', () => {
    const mapped = mapLeadRow(row({ estado: 'algo_raro' }))

    expect(mapped.estado).toBe('pendiente')
  })
})
