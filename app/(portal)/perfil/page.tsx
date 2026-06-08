import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { getClientProfile } from '@/src/modules/profile/application/get-client-profile'
import { ClientProfilePage } from '@/src/modules/profile/ui'

export default async function PerfilPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'client') {
    redirect('/dashboard')
  }

  const clientProfile = getClientProfile(session.user)

  return <ClientProfilePage initialProfile={clientProfile} />
}
