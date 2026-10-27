import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getRealSession } = vi.hoisted(() => ({ getRealSession: vi.fn() }))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getRealSession }))

import { GET } from '@/app/api/view-as/exit/route'

beforeEach(() => {
  vi.resetAllMocks()
})

const url = (query = '') => new Request(`http://localhost/api/view-as/exit${query}`)

describe('GET /api/view-as/exit', () => {
  it('redirige 307 al panel del equipo y borra la cookie de la vista', async () => {
    getRealSession.mockResolvedValue({ user: { role: 'admin' } })

    const response = await GET(url())

    expect(response.status).toBe(307)
    expect(response.headers.get('Location')).toBe('/equipo/clientes')
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=0|Expires=/i)
  })

  it('un asesor vuelve a /clientes', async () => {
    getRealSession.mockResolvedValue({ user: { role: 'advisor' } })

    const response = await GET(url())

    expect(response.headers.get('Location')).toBe('/clientes')
  })

  it('con ?format=json responde el destino sin redirigir y borra igualmente la cookie', async () => {
    getRealSession.mockResolvedValue({ user: { role: 'admin' } })

    const response = await GET(url('?format=json'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ target: '/equipo/clientes' })
    expect(response.headers.get('Location')).toBeNull()
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    expect(response.headers.get('set-cookie')).toMatch(/Max-Age=0|Expires=/i)
  })
})
