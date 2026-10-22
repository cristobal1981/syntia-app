import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ODOO_ERROR,
  odooCall,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

const fetchMock = vi.fn()

function ok(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

function failure(status: number, headers: Record<string, string> = {}): Response {
  return new Response('límite', { status, headers })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  process.env.ODOO_URL = 'https://odoo.example'
  process.env.ODOO_API_KEY = 'key'
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'info').mockImplementation(() => {})
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  delete process.env.ODOO_REQUEST_LOG
})

describe('odooCall: reintentos ante 429', () => {
  it('reintenta tras un 429 y devuelve el resultado, avisando en el log', async () => {
    fetchMock.mockResolvedValueOnce(failure(429)).mockResolvedValueOnce(ok([{ id: 1 }]))

    const promise = odooCall('res.partner', 'search_read')
    await vi.advanceTimersByTimeAsync(1_000)

    await expect(promise).resolves.toEqual([{ id: 1 }])
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining('res.partner/search_read 429, reintento 1/3 en 1000ms')
    )
  })

  it('respeta Retry-After en vez del retardo por defecto', async () => {
    fetchMock.mockResolvedValueOnce(failure(429, { 'retry-after': '3' })).mockResolvedValueOnce(ok([]))

    const promise = odooCall('res.partner', 'search_read')
    await vi.advanceTimersByTimeAsync(2_999)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1)
    await promise
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('tras agotar los reintentos lanza ODOO_RATE_LIMITED', async () => {
    fetchMock.mockResolvedValue(failure(429))

    const promise = odooCall('res.partner', 'search_read')
    const assertion = expect(promise).rejects.toThrow(ODOO_ERROR.RATE_LIMITED)
    await vi.advanceTimersByTimeAsync(1_000 + 2_000 + 4_000)

    await assertion
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })

  it('un fallo que no es 429 no se reintenta', async () => {
    fetchMock.mockResolvedValue(failure(500))

    await expect(odooCall('res.partner', 'search_read')).rejects.toThrow(
      ODOO_ERROR.REQUEST_FAILED
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(console.warn).not.toHaveBeenCalled()
  })
})

describe('registro de peticiones (ODOO_REQUEST_LOG)', () => {
  it('por defecto no deja línea por petición correcta', async () => {
    fetchMock.mockResolvedValue(ok([]))
    await odooSearchRead('res.partner', {})

    expect(console.info).not.toHaveBeenCalled()
  })

  it('con ODOO_REQUEST_LOG=1 deja modelo, método e intentos', async () => {
    process.env.ODOO_REQUEST_LOG = '1'
    fetchMock.mockResolvedValueOnce(failure(429)).mockResolvedValueOnce(ok([]))

    const promise = odooSearchRead('project.task', {})
    await vi.advanceTimersByTimeAsync(1_000)
    await promise

    expect(console.info).toHaveBeenCalledTimes(1)
    expect(console.info).toHaveBeenCalledWith(
      expect.stringMatching(/^\[odoo-req\] project\.task\/search_read ok attempts=2 \d+ms$/)
    )
  })

  it('otro valor de la variable no lo activa', async () => {
    process.env.ODOO_REQUEST_LOG = 'true'
    fetchMock.mockResolvedValue(ok([]))
    await odooSearchRead('res.partner', {})

    expect(console.info).not.toHaveBeenCalled()
  })
})
