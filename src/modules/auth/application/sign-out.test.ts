import { describe, expect, it, vi, beforeEach } from 'vitest'

import { signOut, signOutAction } from '@/src/modules/auth/application/sign-out'

const { cookies, redirect, createSupabaseServerClient, isSupabaseConfigured, signOutSpy } =
  vi.hoisted(() => ({
    cookies: vi.fn(),
    redirect: vi.fn(() => {
      throw new Error('NEXT_REDIRECT')
    }),
    createSupabaseServerClient: vi.fn(),
    isSupabaseConfigured: vi.fn(),
    signOutSpy: vi.fn(),
  }))

vi.mock('next/headers', () => ({ cookies }))
vi.mock('next/navigation', () => ({ redirect }))
vi.mock('@/src/modules/auth/infrastructure/supabase/server', () => ({
  createSupabaseServerClient,
}))
vi.mock('@/src/modules/auth/infrastructure/supabase/env', () => ({ isSupabaseConfigured }))

beforeEach(() => {
  vi.resetAllMocks()
  const deleteFn = vi.fn()
  cookies.mockResolvedValue({ delete: deleteFn })
  redirect.mockImplementation(() => {
    throw new Error('NEXT_REDIRECT')
  })
  createSupabaseServerClient.mockResolvedValue({
    auth: { signOut: signOutSpy },
  })
})

describe('signOutAction', () => {
  it('signs out of Supabase and deletes the local session cookie', async () => {
    isSupabaseConfigured.mockReturnValue(true)
    signOutSpy.mockResolvedValue({ error: null })
    const cookieStore = { delete: vi.fn() }
    cookies.mockResolvedValue(cookieStore)

    await signOutAction()

    expect(signOutSpy).toHaveBeenCalled()
    expect(cookieStore.delete).toHaveBeenCalledWith('syntia-portal-session')
  })

  it('still deletes the local cookie even when Supabase is not configured', async () => {
    isSupabaseConfigured.mockReturnValue(false)
    const cookieStore = { delete: vi.fn() }
    cookies.mockResolvedValue(cookieStore)

    await signOutAction()

    expect(createSupabaseServerClient).not.toHaveBeenCalled()
    expect(cookieStore.delete).toHaveBeenCalledWith('syntia-portal-session')
  })

  it('FIXED 2026-08-25: still deletes the local cookie even when the remote Supabase signOut call throws — the portal session must not survive a failed remote call', async () => {
    isSupabaseConfigured.mockReturnValue(true)
    signOutSpy.mockRejectedValue(new Error('network down'))
    const cookieStore = { delete: vi.fn() }
    cookies.mockResolvedValue(cookieStore)

    await expect(signOutAction()).resolves.toBeUndefined()

    expect(cookieStore.delete).toHaveBeenCalledWith('syntia-portal-session')
  })
})

describe('signOut', () => {
  it('always redirects to /login, even when the cookie deletion path had to swallow a Supabase error', async () => {
    isSupabaseConfigured.mockReturnValue(true)
    signOutSpy.mockRejectedValue(new Error('network down'))
    cookies.mockResolvedValue({ delete: vi.fn() })

    await expect(signOut()).rejects.toThrow('NEXT_REDIRECT')

    expect(redirect).toHaveBeenCalledWith('/login')
  })
})
