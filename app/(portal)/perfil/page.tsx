import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { getClientProfileForClient } from '@/src/modules/profile/application/get-client-profile-for-client'
import { ClientProfilePage } from '@/src/modules/profile/ui'
import { ProfileStateView } from '@/src/modules/profile/ui/profile-state-view'

export default async function PerfilPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'client') {
    redirect('/dashboard')
  }

  const result = await getClientProfileForClient(session.user)

  if (!result.ok) {
    return <ProfileStateView error={result.error} />
  }

  return <ClientProfilePage initialProfile={result.profile} />
}
