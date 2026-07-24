import { redirect } from 'next/navigation'

import { notImplementedPath } from '@/content/errors'
import { getSession } from '@/src/modules/auth/application/get-session'

export default async function DocumentosRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  redirect(notImplementedPath)
}
