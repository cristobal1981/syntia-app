import { describe, expect, it } from 'vitest'
import type { User } from '@supabase/supabase-js'

import { mapSupabaseUser } from '@/src/modules/auth/application/map-supabase-user'

function authUser(overrides: Partial<User> = {}): User {
  return {
    id: 'auth-1',
    email: 'user@example.com',
    user_metadata: {},
    app_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
    ...overrides,
  } as User
}

describe('mapSupabaseUser (the fallback identity used when no portal `users` row exists)', () => {
  it('defaults to the safest role, client, with empty metadata', () => {
    const result = mapSupabaseUser(authUser())
    expect(result.role).toBe('client')
  })

  it('FINDING (defense-in-depth, not currently exploitable): trusts an admin/advisor role straight out of Supabase Auth user_metadata', () => {
    // This app has no public self-signup flow today (verified: no
    // `.auth.signUp()` call anywhere in the codebase — accounts are only
    // created via `.auth.admin.createUser`, service-role only). Google
    // OAuth auto-provisioning does not populate a `role` claim either, so
    // this path is not reachable by an attacker right now. But this function
    // trusts `user_metadata.role` at face value with no server-side check,
    // and `user_metadata` (unlike `app_metadata`) is generally the kind of
    // field a client SDK can set at signup time — if a public signup flow
    // or a different OAuth provider ever gets added, this becomes a live
    // privilege-escalation path unless it's revisited then.
    const result = mapSupabaseUser(authUser({ user_metadata: { role: 'admin' } }))
    expect(result.role).toBe('admin')
  })

  it('never assigns "worker" from metadata alone (worker requires a real colaboradores grant, not just a claimed role)', () => {
    const result = mapSupabaseUser(authUser({ user_metadata: { role: 'worker' } }))
    expect(result.role).toBe('client')
  })

  it('rejects an arbitrary/unknown role string, falling back to client', () => {
    const result = mapSupabaseUser(authUser({ user_metadata: { role: 'super-admin' } }))
    expect(result.role).toBe('client')
  })

  it('prefers full_name, then name, then the email local-part, then "Usuario"', () => {
    expect(mapSupabaseUser(authUser({ user_metadata: { full_name: 'Ada L.' } })).name).toBe(
      'Ada L.'
    )
    expect(mapSupabaseUser(authUser({ user_metadata: { name: 'Ada' } })).name).toBe('Ada')
    expect(mapSupabaseUser(authUser({ email: 'ada@example.com' })).name).toBe('ada')
    expect(mapSupabaseUser(authUser({ email: undefined })).name).toBe('Usuario')
  })

  it('ignores a non-string company_name/full_name/name instead of crashing (malformed metadata)', () => {
    const result = mapSupabaseUser(
      authUser({
        user_metadata: { full_name: 12345, name: { nested: true }, company_name: [] },
      })
    )
    expect(result.name).toBe('user') // falls through to email local-part
    expect(result.companyName).toBeUndefined()
  })
})
