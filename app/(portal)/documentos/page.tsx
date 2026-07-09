import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { DocumentsPage } from '@/src/modules/documents/ui/documents-page'

export default async function DocumentosRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  if (session.user.role !== 'client') {
    redirect('/dashboard')
  }

  return <DocumentsPage user={session.user} />
}
