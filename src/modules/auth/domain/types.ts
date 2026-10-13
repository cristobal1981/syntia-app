export type PortalRole = 'advisor' | 'admin' | 'client' | 'worker'

/**
 * Un `worker` (colaborador) opera sobre los mismos datos de empresa que su
 * titular `client` — cualquier check que hoy exija `role === 'client'` para
 * acceder a datos de empresa (no a gestión de cuenta) debe aceptar también
 * `worker`, y dejar que el filtrado fino de sección viva en
 * `assertSectionAccess`/`getAllowedSectionsForWorker`.
 */
export function isClientOrWorkerRole(
  role: PortalRole
): role is 'client' | 'worker' {
  return role === 'client' || role === 'worker'
}

export type PortalUser = {
  id: string
  email: string
  name: string
  role: PortalRole
  companyName?: string
}

export type PortalSession = {
  user: PortalUser
  expiresAt: number
}

export type AuthCredentials = {
  email: string
  password: string
}

export const SESSION_COOKIE_NAME = 'syntia-portal-session' as const

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
