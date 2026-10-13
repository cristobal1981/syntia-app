import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  deleteImpuestoSociedadesConfig,
  insertImpuestoSociedadesConfig,
  listImpuestoSociedadesConfigs,
  updateImpuestoSociedadesConfig,
} from '@/src/modules/automatizaciones/infrastructure/impuesto-sociedades-config-repository.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

function chainFor(result: QueryResult) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = vi.fn(() => chain)
  chain.insert = vi.fn(() => chain)
  chain.update = vi.fn(() => chain)
  chain.delete = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.order = vi.fn(() => chain)
  chain.single = () => resolved
  chain.then = (resolve: (v: QueryResult) => void, reject: (e: unknown) => void) =>
    resolved.then(resolve, reject)
  return chain
}

function configRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cfg-1',
    anio: 2024,
    tipo_empresa_key: 'general',
    es_escala: false,
    tipo_gravamen_fijo: 25,
    base_gravamen: null,
    tipo_gravamen_base: null,
    tipo_gravamen_restante: null,
    updated_at: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listImpuestoSociedadesConfigs', () => {
  it('maps rows to camelCase and orders by year desc, then tipo_empresa_key asc', async () => {
    const chain = chainFor({ data: [configRow()], error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    const result = await listImpuestoSociedadesConfigs()

    expect(result).toEqual([
      {
        id: 'cfg-1',
        anio: 2024,
        tipoEmpresaKey: 'general',
        esEscala: false,
        tipoGravamenFijo: 25,
        baseGravamen: null,
        tipoGravamenBase: null,
        tipoGravamenRestante: null,
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
    ])
    expect(chain.order).toHaveBeenCalledWith('anio', { ascending: false })
    expect(chain.order).toHaveBeenCalledWith('tipo_empresa_key', { ascending: true })
  })

  it('throws the raw Supabase error on failure', async () => {
    const dbError = { message: 'list failed' }
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: dbError }),
    })

    await expect(listImpuestoSociedadesConfigs()).rejects.toBe(dbError)
  })
})

describe('insertImpuestoSociedadesConfig', () => {
  it('maps camelCase input to snake_case and stamps updated_at', async () => {
    const chain = chainFor({ data: configRow(), error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    const result = await insertImpuestoSociedadesConfig({
      anio: 2024,
      tipoEmpresaKey: 'general',
      esEscala: false,
      tipoGravamenFijo: 25,
      baseGravamen: null,
      tipoGravamenBase: null,
      tipoGravamenRestante: null,
    })

    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        anio: 2024,
        tipo_empresa_key: 'general',
        es_escala: false,
        tipo_gravamen_fijo: 25,
      })
    )
    expect(result.tipoEmpresaKey).toBe('general')
  })

  it('throws on an insert error', async () => {
    const dbError = { message: 'insert failed' }
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: dbError }),
    })

    await expect(
      insertImpuestoSociedadesConfig({
        anio: 2024,
        tipoEmpresaKey: 'general',
        esEscala: false,
        tipoGravamenFijo: 25,
        baseGravamen: null,
        tipoGravamenBase: null,
        tipoGravamenRestante: null,
      })
    ).rejects.toBe(dbError)
  })
})

describe('updateImpuestoSociedadesConfig', () => {
  it('scopes the update to the given id', async () => {
    const chain = chainFor({ data: configRow(), error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await updateImpuestoSociedadesConfig('cfg-1', {
      anio: 2024,
      tipoEmpresaKey: 'general',
      esEscala: true,
      tipoGravamenFijo: null,
      baseGravamen: 100000,
      tipoGravamenBase: 15,
      tipoGravamenRestante: 25,
    })

    expect(chain.eq).toHaveBeenCalledWith('id', 'cfg-1')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ es_escala: true, base_gravamen: 100000 })
    )
  })
})

describe('deleteImpuestoSociedadesConfig', () => {
  it('scopes the delete to the given id and throws on error', async () => {
    const dbError = { message: 'delete failed' }
    const chain = chainFor({ error: dbError })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await expect(deleteImpuestoSociedadesConfig('cfg-1')).rejects.toBe(dbError)
    expect(chain.eq).toHaveBeenCalledWith('id', 'cfg-1')
  })

  it('succeeds silently when there is no error', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await expect(deleteImpuestoSociedadesConfig('cfg-1')).resolves.toBeUndefined()
  })
})
