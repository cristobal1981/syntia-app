import { beforeEach, describe, expect, it, vi } from 'vitest'

import { finalizeRecoverySessionAction } from '@/src/modules/auth/application/finalize-recovery-session'

const {
  redirect,
  establishPortalSession,
  resolvePortalUserFromAuth,
  createSupabaseServerClient,
  isSupabaseConfigured,
  getUser,
} = vi.hoisted(() => ({
  redirect: vi.fn(),
  establishPortalSession: vi.fn(),
  resolvePortalUserFromAuth: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  isSupabaseConfigured: vi.fn(),
  getUser: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect }))
vi.mock('@/src/modules/auth/application/establish-portal-session', () => ({
  establishPortalSession,
}))
vi.mock('@/src/modules/auth/application/resolve-portal-user', () => ({
  resolvePortalUserFromAuth,
}))
vi.mock('@/src/modules/auth/infrastructure/supabase/server', () => ({
  createSupabaseServerClient,
}))
vi.mock('@/src/modules/auth/infrastructure/supabase/env', () => ({ isSupabaseConfigured }))

const authUser = { id: 'auth-1', email: 'user@example.com' }
const portalUser = { id: 'auth-1', email: 'user@example.com', name: 'U', role: 'client' }

beforeEach(() => {
  vi.resetAllMocks()
  isSupabaseConfigured.mockReturnValue(true)
  createSupabaseServerClient.mockResolvedValue({ auth: { getUser } })
  getUser.mockResolvedValue({ data: { user: authUser } })
  resolvePortalUserFromAuth.mockResolvedValue(portalUser)
})

describe('finalizeRecoverySessionAction', () => {
  it('not_configured si Supabase no está configurado, sin tocar el cliente', async () => {
    isSupabaseConfigured.mockReturnValue(false)

    expect(await finalizeRecoverySessionAction()).toEqual({ ok: false, error: 'not_configured' })
    expect(createSupabaseServerClient).not.toHaveBeenCalled()
    expect(establishPortalSession).not.toHaveBeenCalled()
  })

  it('no_session si no hay usuario de auth: no resuelve ni establece sesión', async () => {
    getUser.mockResolvedValue({ data: { user: null } })

    expect(await finalizeRecoverySessionAction()).toEqual({ ok: false, error: 'no_session' })
    expect(resolvePortalUserFromAuth).not.toHaveBeenCalled()
    expect(establishPortalSession).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('account_disabled si la cuenta está archivada/sin acceso: no establece sesión ni redirige', async () => {
    resolvePortalUserFromAuth.mockResolvedValue(null)

    expect(await finalizeRecoverySessionAction()).toEqual({
      ok: false,
      error: 'account_disabled',
    })
    expect(resolvePortalUserFromAuth).toHaveBeenCalledWith(authUser)
    expect(establishPortalSession).not.toHaveBeenCalled()
    expect(redirect).not.toHaveBeenCalled()
  })

  it('camino feliz: establece la sesión con el usuario resuelto (no el de auth) y redirige a /dashboard', async () => {
    await finalizeRecoverySessionAction()

    expect(establishPortalSession).toHaveBeenCalledWith(portalUser)
    expect(redirect).toHaveBeenCalledWith('/dashboard')
    expect(establishPortalSession.mock.invocationCallOrder[0]).toBeLessThan(
      redirect.mock.invocationCallOrder[0]
    )
  })

  it('propaga el error de resolver al usuario sin establecer sesión', async () => {
    resolvePortalUserFromAuth.mockRejectedValue(new Error('db down'))

    await expect(finalizeRecoverySessionAction()).rejects.toThrow('db down')
    expect(establishPortalSession).not.toHaveBeenCalled()
  })
})
