import { isGoogleDriveApiConfigured } from '@/src/modules/documents/infrastructure/google-drive-auth'

/**
 * Mock activo si:
 * - DRIVE_DOCUMENTS_MOCK=true, o
 * - Google Drive no está configurado (salvo DRIVE_DOCUMENTS_MOCK=false explícito).
 */
export function shouldUseMockDrive(): boolean {
  const flag = process.env.DRIVE_DOCUMENTS_MOCK?.trim().toLowerCase()
  if (flag === 'false') return false
  if (flag === 'true') return true
  return !isGoogleDriveApiConfigured()
}
