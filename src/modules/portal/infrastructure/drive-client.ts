/**
 * Contrato Google Drive (documentos). Implementación real vía service account / OAuth.
 */

export type DriveDocument = {
  id: string
  name: string
  modifiedAt: string
  mimeType: string
}

export interface DriveClient {
  listRecentDocuments(folderId: string): Promise<DriveDocument[]>
}

export const driveClient: DriveClient = {
  async listRecentDocuments() {
    throw new Error('Drive client no configurado')
  },
}
