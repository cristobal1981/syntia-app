import { cookies } from 'next/headers'

import { SESSION_COOKIE_NAME } from '@/src/modules/auth/domain/types'
import { getSessionFromToken } from '@/src/modules/auth/infrastructure/session-cookie'
import { ClientHomeSkeleton, StaffHomeBentoSkeleton } from '@/src/modules/portal/ui/skeletons'

export default async function DashboardLoading() {
  // Lectura barata (verificación HMAC local, sin llamada a Supabase/Odoo) solo
  // para elegir la forma del skeleton acorde al rol; DashboardPage repite la
  // validación completa de la sesión.
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  const session = await getSessionFromToken(token)

  if (session?.user.role === 'client') {
    return <ClientHomeSkeleton />
  }

  return <StaffHomeBentoSkeleton />
}
