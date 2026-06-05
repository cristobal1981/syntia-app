import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'

export default async function RootPage() {
  const session = await getSession()
  redirect(session ? '/dashboard' : '/login')
}
