import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getSession, isCachedAdvisorPartner, getCachedAdvisorPresence, isOdooApiConfigured } =
  vi.hoisted(() => ({
    getSession: vi.fn(),
    isCachedAdvisorPartner: vi.fn(),
    getCachedAdvisorPresence: vi.fn(),
    isOdooApiConfigured: vi.fn(),
  }))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/portal/infrastructure/cached-partner-avatar', () => ({
  isCachedAdvisorPartner,
}))
vi.mock('@/src/modules/portal/infrastructure/cached-advisor-presence', () => ({
  getCachedAdvisorPresence,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({ isOdooApiConfigured }))

import { GET } from '@/app/api/portal/advisor-presence/[partnerId]/route'

const call = (partnerId: string) =>
  GET(new Request('http://localhost/api/portal/advisor-presence/1'), {
    params: Promise.resolve({ partnerId }),
  })

beforeEach(() => {
  vi.resetAllMocks()
  getSession.mockResolvedValue({ user: { id: 'u1', role: 'client' } })
  isOdooApiConfigured.mockReturnValue(true)
  isCachedAdvisorPartner.mockResolvedValue(true)
  getCachedAdvisorPresence.mockResolvedValue('online')
})

describe('GET /api/portal/advisor-presence/[partnerId]', () => {
  it('401 sin sesión y 401 con un rol que no es de cliente ni colaborador', async () => {
    getSession.mockResolvedValue(null)
    expect((await call('1')).status).toBe(401)

    getSession.mockResolvedValue({ user: { id: 'a', role: 'admin' } })
    expect((await call('1')).status).toBe(401)
    expect(getCachedAdvisorPresence).not.toHaveBeenCalled()
  })

  it('503 si Odoo no está configurado', async () => {
    isOdooApiConfigured.mockReturnValue(false)
    expect((await call('1')).status).toBe(503)
  })

  it.each(['abc', '0', '-3'])('400 con un id inválido (%s)', async (id) => {
    expect((await call(id)).status).toBe(400)
    expect(getCachedAdvisorPresence).not.toHaveBeenCalled()
  })

  it('404 si el partner no es un asesor, sin consultar su presencia', async () => {
    isCachedAdvisorPartner.mockResolvedValue(false)
    expect((await call('9')).status).toBe(404)
    expect(getCachedAdvisorPresence).not.toHaveBeenCalled()
  })

  it('devuelve la presencia cacheada y no deja que el navegador la guarde', async () => {
    const response = await call('9')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ presence: 'online' })
    expect(getCachedAdvisorPresence).toHaveBeenCalledWith(9)
    expect(response.headers.get('cache-control')).toContain('no-store')
  })

  it('un asesor sin usuario en Odoo figura como offline', async () => {
    getCachedAdvisorPresence.mockResolvedValue(null)
    expect(await (await call('9')).json()).toEqual({ presence: 'offline' })
  })

  it('503 si falla Odoo', async () => {
    getCachedAdvisorPresence.mockRejectedValue(new Error('odoo'))
    expect((await call('9')).status).toBe(503)
  })
})
