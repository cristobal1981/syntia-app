import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { assertSectionAccess } from '@/src/modules/colaboradores/application/assert-section-access'
import { DocumentsPage } from '@/src/modules/documents/ui/documents-page'

export default async function DocumentosRoutePage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  await assertSectionAccess(session, '/documentos')

  return <DocumentsPage user={session.user} />
}
