import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { ColaboradoresStaffPage } from '@/src/modules/colaboradores/ui/colaboradores-staff-page'

export default async function ColaboradoresRoutePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.user.role !== 'advisor') redirect('/dashboard')
  return <ColaboradoresStaffPage />
}
