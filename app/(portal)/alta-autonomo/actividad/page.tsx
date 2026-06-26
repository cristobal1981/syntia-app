import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { AltaAutonomoActividadStepPage } from '@/src/modules/alta-autonomo/ui'

export default async function AltaAutonomoActividadRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'client') {
    redirect('/dashboard')
  }

  return <AltaAutonomoActividadStepPage />
}
