import type { AuthCredentials, PortalUser } from '@/src/modules/auth/domain/types'

const DEMO_PASSWORD = 'demo'

const MOCK_USERS: PortalUser[] = [
  {
    id: 'user-advisor-1',
    email: 'advisor@syntia.demo',
    name: 'Laura Méndez',
    role: 'advisor',
    companyName: 'Syntia',
  },
  {
    id: 'user-admin-1',
    email: 'admin@empresa.demo',
    name: 'Carlos Ruiz',
    role: 'admin',
    companyName: 'Acme Industrial',
  },
  {
    id: 'user-client-1',
    email: 'client@empresa.demo',
    name: 'Elena Vidal',
    role: 'client',
    companyName: 'Acme Industrial',
  },
]

export async function authenticateMockUser(
  credentials: AuthCredentials
): Promise<PortalUser | null> {
  const email = credentials.email.trim().toLowerCase()
  const user = MOCK_USERS.find((entry) => entry.email === email)
  if (!user || credentials.password !== DEMO_PASSWORD) {
    return null
  }
  return user
}

export function listDemoAccounts(): Pick<PortalUser, 'email' | 'role'>[] {
  return MOCK_USERS.map(({ email, role }) => ({ email, role }))
}
