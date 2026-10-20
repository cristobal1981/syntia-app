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
  /**
   * Solo se rellena en memoria cuando un asesor/admin está viendo el portal
   * como un cliente (`user` es entonces el cliente). Nunca viaja en la cookie
   * de sesión: `user` real del staff queda aquí.
   */
  viewingAs?: { staff: PortalUser }
}

export const SESSION_COOKIE_NAME = 'syntia-portal-session' as const

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

/** Cookie firmada aparte que activa la «vista como cliente» (solo lectura). */
export const VIEW_AS_COOKIE_NAME = 'syntia-view-as' as const

export const VIEW_AS_MAX_AGE_SECONDS = 60 * 60 * 2

export type ViewAsPayload = {
  /** auth id del asesor/admin que abrió la vista. */
  staffAuthId: string
  /** `users.id` del cliente que se está viendo. */
  clientUserId: string
  expiresAt: number
}
