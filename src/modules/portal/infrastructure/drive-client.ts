export type DriveDocument = {
  id: string
  name: string
  modifiedAt: string
  mimeType: string
}

/**
 * @deprecated Use src/modules/documents/infrastructure/google-drive-repository.ts
 */
export interface DriveClient {
  listRecentDocuments(folderId: string): Promise<DriveDocument[]>
}

export const driveClient: DriveClient = {
  async listRecentDocuments() {
    throw new Error('Drive client no configurado')
  },
}
