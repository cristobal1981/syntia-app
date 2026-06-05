export type PortalRole = 'advisor' | 'admin' | 'client'

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
