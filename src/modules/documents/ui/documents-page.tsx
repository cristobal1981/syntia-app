import { listDriveFolderAction } from '@/src/modules/documents/application/portal-drive-document-actions'
import { DocumentsLoadError } from '@/src/modules/documents/ui/documents-load-error'
import { DocumentsPageView } from '@/src/modules/documents/ui/documents-page-view'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { getWorkerWriteSections } from '@/src/modules/colaboradores/application/get-worker-write-sections'

type DocumentsPageProps = {
  user: PortalUser
  /** Carpeta pedida en la URL (`?carpeta=`); sin ella, Inicio. */
  folderId?: string
}

export async function DocumentsPage({ user, folderId }: DocumentsPageProps) {
  const [initial, writeSections] = await Promise.all([
    listDriveFolderAction(folderId ? { folderId } : undefined),
    user.role === 'worker' ? getWorkerWriteSections(user) : null,
  ])
  const canWrite = user.role !== 'worker' || (writeSections?.has('/documentos') ?? false)

  // Un fallo al cargar se explica con un aviso claro (nunca una pantalla en blanco).
  if (!initial.ok) {
    return <DocumentsLoadError code={initial.error} />
  }

  // El listado ya obtenido viaja al cliente: no se vuelve a pedir al montar.
  // Si la carpeta pedida ya no existe, el cliente se recupera por su cuenta.
  return (
    <DocumentsPageView
      canWrite={canWrite}
      initialListing={initial.listing}
    />
  )
}
