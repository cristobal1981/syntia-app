import { redirect } from 'next/navigation'
import { Suspense } from 'react'

import { getSession } from '@/src/modules/auth/application/get-session'

export default function RootPage() {
  return (
    <Suspense fallback={null}>
      <RootRedirect />
    </Suspense>
  )
}

async function RootRedirect() {
  const session = await getSession()
  return redirect(session ? '/dashboard' : '/login')
}
