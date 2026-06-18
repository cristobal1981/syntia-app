import { buildDisplayName } from '@/src/modules/directory/domain/map-directory-row'
import type {
  ClientRecord,
  CreateClientInput,
  DirectoryListScope,
  GestorRecord,
  PersonNameParts,
  UpdateClientInput,
  UpdateGestorInput,
} from '@/src/modules/directory/domain/types'
import type { DirectoryRepository } from '@/src/modules/directory/infrastructure/directory-repository'
import {
  shouldSkipClientInviteEmail,
  shouldUseResendClientInvite,
} from '@/src/modules/directory/infrastructure/directory-env'
import { getSiteUrl } from '@/src/modules/auth/infrastructure/supabase/env'
import { sendClientInviteEmail } from '@/src/modules/email/application/send-client-invite-email'
import { isResendConfigured } from '@/src/modules/email/infrastructure/resend-env'

function withDisplayName<T extends PersonNameParts>(record: T): T & { name: string } {
  return {
    ...record,
    name: buildDisplayName(
      record.firstName,
      record.firstSurname,
      record.secondSurname
    ),
  }
}

const MOCK_GESTORES: GestorRecord[] = [
  withDisplayName({
    id: 'user-advisor-1',
    firstName: 'Laura',
    firstSurname: 'Méndez',
    email: 'advisor@syntia.demo',
    role: 'advisor',
    companyName: 'Syntia',
    phone: '+34 600 111 222',
    status: 'active',
  }),
  withDisplayName({
    id: 'user-admin-1',
    firstName: 'Carlos',
    firstSurname: 'Ruiz',
    email: 'admin@empresa.demo',
    role: 'admin',
    companyName: 'Acme Industrial',
    status: 'active',
  }),
  withDisplayName({
    id: 'gestor-2',
    firstName: 'Miguel',
    firstSurname: 'Ortega',
    email: 'miguel@tenaasesores.es',
    role: 'advisor',
    companyName: 'Tena Asesores',
    status: 'active',
  }),
  withDisplayName({
    id: 'gestor-3',
    firstName: 'Sara',
    firstSurname: 'Núñez',
    email: 'sara@tenaasesores.es',
    role: 'advisor',
    companyName: 'Tena Asesores',
    status: 'invited',
  }),
]

let mockClients: ClientRecord[] = [
  withDisplayName({
    id: 'user-client-1',
    firstName: 'Elena',
    firstSurname: 'Vidal',
    email: 'client@empresa.demo',
    companyName: 'Acme Industrial',
    phone: '+34 600 333 444',
    odooPartnerId: '1042',
    advisorId: 'user-advisor-1',
    advisorName: 'Laura Méndez',
    status: 'active',
  }),
  withDisplayName({
    id: 'client-2',
    firstName: 'Nova Labs',
    firstSurname: 'S.L.',
    email: 'contacto@novalabs.es',
    companyName: 'Nova Labs S.L.',
    odooPartnerId: '2088',
    advisorId: 'user-advisor-1',
    advisorName: 'Laura Méndez',
    status: 'active',
  }),
  withDisplayName({
    id: 'client-3',
    firstName: 'Helios',
    firstSurname: 'Retail',
    email: 'admin@heliosretail.com',
    companyName: 'Helios Retail',
    advisorId: 'gestor-2',
    advisorName: 'Miguel Ortega',
    status: 'active',
  }),
  withDisplayName({
    id: 'client-4',
    firstName: 'Brisa',
    firstSurname: 'Studio',
    email: 'hola@brisastudio.com',
    companyName: 'Brisa Studio',
    advisorId: 'gestor-3',
    advisorName: 'Sara Núñez',
    status: 'invited',
  }),
]

function resolveAdvisorName(advisorId?: string): string | undefined {
  if (!advisorId) return undefined
  return MOCK_GESTORES.find((gestor) => gestor.id === advisorId)?.name
}

export const mockDirectoryRepository: DirectoryRepository = {
  async listGestores() {
    return [...MOCK_GESTORES]
  },

  async listClients(scope) {
    if (scope.role === 'admin') {
      return [...mockClients]
    }
    return mockClients.filter((client) => client.advisorId === scope.userId)
  },

  async getGestor(id) {
    return MOCK_GESTORES.find((gestor) => gestor.id === id) ?? null
  },

  async getClient(id) {
    const client = mockClients.find((entry) => entry.id === id)
    if (!client) return null
    return {
      ...client,
      advisorName: resolveAdvisorName(client.advisorId),
    }
  },

  async createClient(input: CreateClientInput) {
    const duplicate = mockClients.some(
      (client) => client.email.toLowerCase() === input.email.trim().toLowerCase()
    )
    if (duplicate) {
      throw new Error('DUPLICATE_EMAIL')
    }

    const created: ClientRecord = {
      ...withDisplayName(input),
      id: `client-${Date.now()}`,
      status: 'invited',
      advisorName: resolveAdvisorName(input.advisorId),
    }
    mockClients = [...mockClients, created]

    let inviteSent = false
    if (!shouldSkipClientInviteEmail()) {
      if (shouldUseResendClientInvite()) {
        if (!isResendConfigured()) {
          throw new Error('RESEND_NOT_CONFIGURED')
        }
        await sendClientInviteEmail({
          clientEmail: input.email,
          inviteLink: `${getSiteUrl()}/login/restablecer`,
        })
        inviteSent = true
      } else {
        inviteSent = true
      }
    }

    return { client: created, inviteSent }
  },

  async updateGestor(input) {
    const index = MOCK_GESTORES.findIndex((gestor) => gestor.id === input.id)
    if (index === -1) {
      throw new Error('Gestor no encontrado')
    }
    const updated = withDisplayName(input)
    MOCK_GESTORES[index] = updated
    return updated
  },

  async updateClient(input) {
    const index = mockClients.findIndex((client) => client.id === input.id)
    if (index === -1) {
      throw new Error('Cliente no encontrado')
    }
    const updated: ClientRecord = {
      ...withDisplayName(input),
      advisorName: resolveAdvisorName(input.advisorId),
    }
    mockClients[index] = updated
    return updated
  },

  async deleteClient(id) {
    const exists = mockClients.some((client) => client.id === id)
    if (!exists) {
      throw new Error('NOT_FOUND')
    }
    mockClients = mockClients.filter((client) => client.id !== id)
  },

  async resendClientAccessEmail(clientId) {
    const client = mockClients.find((entry) => entry.id === clientId)
    if (!client) {
      throw new Error('NOT_FOUND')
    }

    if (shouldSkipClientInviteEmail() && !shouldUseResendClientInvite()) {
      throw new Error('INVITE_EMAIL_DISABLED')
    }

    if (shouldUseResendClientInvite()) {
      if (!isResendConfigured()) {
        throw new Error('RESEND_NOT_CONFIGURED')
      }
      await sendClientInviteEmail({
        clientEmail: client.email,
        inviteLink: `${getSiteUrl()}/login/restablecer`,
      })
      return
    }
  },

  async listAdvisorOptions() {
    return MOCK_GESTORES.filter((gestor) => gestor.role === 'advisor').map(
      (gestor) => ({ id: gestor.id, name: gestor.name })
    )
  },
}
