import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { ColaboradoresStaffPage } from '@/src/modules/colaboradores/ui/colaboradores-staff-page'

export default async function EquipoColaboradoresRoutePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.role !== 'admin') redirect('/dashboard')
  return <ColaboradoresStaffPage />
}
