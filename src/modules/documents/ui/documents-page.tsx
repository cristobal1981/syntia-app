import { listDriveFolderAction } from '@/src/modules/documents/application/portal-drive-document-actions'
import { shouldUseMockDrive } from '@/src/modules/documents/infrastructure/drive-runtime'
import {
  DocumentsPageView,
  DocumentsStateView,
} from '@/src/modules/documents/ui/documents-page-view'
import type { PortalUser } from '@/src/modules/auth/domain/types'
import { clientDocuments } from '@/content/client-documents'

type DocumentsPageProps = {
  user: PortalUser
}

export async function DocumentsPage({ user }: DocumentsPageProps) {
  void user

  const demoMode = shouldUseMockDrive()
  const initial = await listDriveFolderAction()

  if (!initial.ok) {
    const states = clientDocuments.states
    if (initial.error === 'not_linked') {
      return (
        <DocumentsStateView
          title={states.notLinked.title}
          description={states.notLinked.description}
        />
      )
    }
    if (initial.error === 'forbidden') {
      return (
        <DocumentsStateView
          title={states.forbidden.title}
          description={states.forbidden.description}
          variant="destructive"
        />
      )
    }
    if (!demoMode) {
      return (
        <DocumentsStateView
          title={states.driveUnavailable.title}
          description={states.driveUnavailable.description}
        />
      )
    }
  }

  return <DocumentsPageView demoMode={demoMode} />
}
