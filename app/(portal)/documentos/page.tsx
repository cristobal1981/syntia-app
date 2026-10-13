import { redirect } from 'next/navigation'

import { getDocumentsSession } from '@/src/modules/documents/application/get-documents-session'
import { parseFolderParam } from '@/src/modules/documents/domain/drive-folder-url'
import { assertSectionAccess } from '@/src/modules/colaboradores/application/assert-section-access'
import { DocumentsPage } from '@/src/modules/documents/ui/documents-page'

export default async function DocumentosRoutePage(props: PageProps<'/documentos'>) {
  const [session, searchParams] = await Promise.all([getDocumentsSession(), props.searchParams])
  if (!session) {
    redirect('/login')
  }

  await assertSectionAccess(session, '/documentos')

  const carpeta = searchParams.carpeta
  const folderId = parseFolderParam(Array.isArray(carpeta) ? carpeta[0] : carpeta) ?? undefined

  return <DocumentsPage user={session.user} folderId={folderId} />
}
