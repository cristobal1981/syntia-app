import { describe, expect, it, vi, beforeEach } from 'vitest'

import { createSupabaseServerClient } from '@/src/modules/auth/infrastructure/supabase/server'

type CookiesConfig = {
  getAll: () => { name: string; value: string }[]
  setAll: (cookiesToSet: { name: string; value: string; options?: unknown }[]) => void
}

const { createServerClient, cookies } = vi.hoisted(() => ({
  createServerClient: vi.fn((..._args: [string, string, { cookies: CookiesConfig }]) => ({
    fake: 'client',
  })),
  cookies: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({ createServerClient }))
vi.mock('next/headers', () => ({ cookies }))

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
})

describe('createSupabaseServerClient', () => {
  it('throws instead of returning a half-configured client when env vars are missing', async () => {
    await expect(createSupabaseServerClient()).rejects.toThrow('Supabase no configurado')
    expect(createServerClient).not.toHaveBeenCalled()
  })

  it('passes the configured URL/key, and proxies getAll/setAll to the Next.js cookie store', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

    const cookieStore = {
      getAll: vi.fn(() => [{ name: 'a', value: '1' }]),
      set: vi.fn(),
    }
    cookies.mockResolvedValue(cookieStore)

    await createSupabaseServerClient()

    expect(createServerClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    )

    const cookiesConfig = createServerClient.mock.calls[0][2].cookies

    expect(cookiesConfig.getAll()).toEqual([{ name: 'a', value: '1' }])

    cookiesConfig.setAll([{ name: 'x', value: 'y', options: { path: '/' } }])
    expect(cookieStore.set).toHaveBeenCalledWith('x', 'y', { path: '/' })
  })

  it('swallows a cookie-write error instead of crashing the whole request (Server Components cannot write cookies, and that is expected)', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'

    const cookieStore = {
      getAll: vi.fn(() => []),
      set: vi.fn(() => {
        throw new Error('Cookies can only be modified in a Server Action or Route Handler')
      }),
    }
    cookies.mockResolvedValue(cookieStore)

    await createSupabaseServerClient()
    const cookiesConfig = createServerClient.mock.calls[0][2].cookies

    expect(() =>
      cookiesConfig.setAll([{ name: 'x', value: 'y' }])
    ).not.toThrow()
  })
})
