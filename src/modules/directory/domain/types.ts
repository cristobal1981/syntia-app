import type { PortalRole } from '@/src/modules/auth/domain/types'

/**
 * Esquema Supabase (portal):
 * - users: cuenta (id uuid, email, role, status, is_active, auth_user_id)
 * - profiles: datos extendidos (user_id → users.id)
 */
export type PersonStatus = 'active' | 'invited'

export type PersonNameParts = {
  firstName: string
  firstSurname: string
  secondSurname?: string
}

export type GestorRecord = PersonNameParts & {
  id: string
  name: string
  email: string
  role: Extract<PortalRole, 'advisor' | 'admin'>
  companyName?: string
  phone?: string
  status: PersonStatus
}

export type ClientRecord = PersonNameParts & {
  id: string
  name: string
  email: string
  phone?: string
  companyName?: string
  odooPartnerId?: string
  advisorId?: string
  advisorName?: string
  status: PersonStatus
}

export type UpdateGestorInput = PersonNameParts & {
  id: string
  email: string
  role: Extract<PortalRole, 'advisor' | 'admin'>
  companyName?: string
  phone?: string
  status: PersonStatus
}

export type CreateClientResult = {
  client: ClientRecord
  inviteSent: boolean
}

export type CreateGestorResult = {
  gestor: GestorRecord
  inviteSent: boolean
}

export type CreateGestorInput = PersonNameParts & {
  email: string
  role: Extract<PortalRole, 'advisor' | 'admin'>
  companyName?: string
  phone?: string
}

export type CreateClientInput = PersonNameParts & {
  email: string
  phone?: string
  companyName?: string
  odooPartnerId?: string
  advisorId?: string
}

export type UpdateClientInput = PersonNameParts & {
  id: string
  email: string
  phone?: string
  companyName?: string
  odooPartnerId?: string
  advisorId?: string
  status: PersonStatus
}

export type DirectoryListScope = {
  role: PortalRole
  userId: string
}
