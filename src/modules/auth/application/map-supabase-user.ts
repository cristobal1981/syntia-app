import type { User } from '@supabase/supabase-js'

import type { PortalRole, PortalUser } from '@/src/modules/auth/domain/types'

const VALID_ROLES: PortalRole[] = ['advisor', 'admin', 'client']

function resolveRole(metadata: Record<string, unknown> | undefined): PortalRole {
  const role = metadata?.role
  if (typeof role === 'string' && VALID_ROLES.includes(role as PortalRole)) {
    return role as PortalRole
  }
  return 'client'
}

/** Fallback cuando no hay fila en public.users. El rol canónico vive en public.users. */

export function mapSupabaseUser(user: User): PortalUser {
  const metadata = user.user_metadata ?? {}

  return {
    id: user.id,
    email: user.email ?? '',
    name:
      (typeof metadata.full_name === 'string' && metadata.full_name) ||
      (typeof metadata.name === 'string' && metadata.name) ||
      user.email?.split('@')[0] ||
      'Usuario',
    role: resolveRole(metadata),
    companyName:
      typeof metadata.company_name === 'string'
        ? metadata.company_name
        : undefined,
  }
}
