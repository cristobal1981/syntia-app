import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { AltaAutonomoResumenStepPage } from '@/src/modules/alta-autonomo/ui'

export default async function AltaAutonomoResumenRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'client') {
    redirect('/dashboard')
  }

  return <AltaAutonomoResumenStepPage />
}
