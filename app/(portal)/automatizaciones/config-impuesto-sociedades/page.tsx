import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { ImpuestoSociedadesConfigPage } from '@/src/modules/automatizaciones/ui/impuesto-sociedades-config-page'

export default async function ImpuestoSociedadesConfigRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }

  return <ImpuestoSociedadesConfigPage />
}
