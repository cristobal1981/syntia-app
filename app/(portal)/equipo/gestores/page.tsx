import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { GestoresPage } from '@/src/modules/directory/ui/gestores-page'

export default async function EquipoGestoresRoutePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.role !== 'admin') redirect('/dashboard')
  return <GestoresPage />
}
