import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'

const { getViewAsFromToken, fetchViewAsClient, resolveDirectoryActorId, headers } = vi.hoisted(
  () => ({
    getViewAsFromToken: vi.fn(),
    fetchViewAsClient: vi.fn(),
    resolveDirectoryActorId: vi.fn(),
    headers: vi.fn(),
  })
)

vi.mock('react', () => ({ cache: <T>(fn: T) => fn }))
vi.mock('next/headers', () => ({ headers }))
vi.mock('@/src/modules/auth/infrastructure/session-cookie', () => ({ getViewAsFromToken }))
vi.mock('@/src/modules/auth/infrastructure/fetch-view-as-client', () => ({ fetchViewAsClient }))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({ resolveDirectoryActorId }))

import { applyViewAs } from '@/src/modules/auth/application/resolve-view-as-session'

const clientUser = { id: 'auth-c', email: 'c@x.es', name: 'Cli', role: 'client' as const }
const staff = (role: 'advisor' | 'admin'): PortalSession => ({
  user: { id: 'auth-s', email: 's@x.es', name: 'Staff', role },
  expiresAt: Date.now() + 1000,
})

beforeEach(() => {
  vi.resetAllMocks()
  getViewAsFromToken.mockResolvedValue({ staffAuthId: 'auth-s', clientUserId: 'u-c', expiresAt: 1 })
  fetchViewAsClient.mockResolvedValue({ user: clientUser, advisorId: 'u-s' })
  resolveDirectoryActorId.mockResolvedValue('u-s')
  headers.mockResolvedValue(new Headers())
})

describe('applyViewAs', () => {
  it('sin cookie devuelve la sesión real', async () => {
    const s = staff('advisor')
    expect(await applyViewAs(s, undefined)).toBe(s)
  })

  it('asesor del cliente: la sesión pasa a ser la del cliente y recuerda al staff', async () => {
    const s = staff('advisor')
    const result = await applyViewAs(s, 'tok')
    expect(result?.user).toEqual(clientUser)
    expect(result?.viewingAs?.staff).toEqual(s.user)
  })

  it('admin ve a un cliente que no es suyo', async () => {
    fetchViewAsClient.mockResolvedValue({ user: clientUser, advisorId: 'otro' })
    const result = await applyViewAs(staff('admin'), 'tok')
    expect(result?.viewingAs).toBeTruthy()
  })

  it('asesor sin ese cliente asignado: se ignora la vista', async () => {
    fetchViewAsClient.mockResolvedValue({ user: clientUser, advisorId: 'otro' })
    const s = staff('advisor')
    expect(await applyViewAs(s, 'tok')).toBe(s)
  })

  it('cookie de otro usuario, cliente inexistente o token inválido: se ignora', async () => {
    const s = staff('admin')
    getViewAsFromToken.mockResolvedValueOnce({ staffAuthId: 'auth-x', clientUserId: 'u-c', expiresAt: 1 })
    expect(await applyViewAs(s, 'tok')).toBe(s)
    getViewAsFromToken.mockResolvedValueOnce(null)
    expect(await applyViewAs(s, 'tok')).toBe(s)
    fetchViewAsClient.mockResolvedValueOnce(null)
    expect(await applyViewAs(s, 'tok')).toBe(s)
  })

  it('un cliente con cookie de vista no la usa', async () => {
    const s: PortalSession = { ...staff('admin'), user: { ...staff('admin').user, role: 'client' } }
    expect(await applyViewAs(s, 'tok')).toBe(s)
    expect(getViewAsFromToken).not.toHaveBeenCalled()
  })

  it('una server action bajo la vista no tiene sesión', async () => {
    headers.mockResolvedValue(new Headers({ 'next-action': 'abc' }))
    expect(await applyViewAs(staff('admin'), 'tok')).toBeNull()
  })
})
