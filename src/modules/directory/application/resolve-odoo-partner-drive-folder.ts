import { parseGoogleDriveParentFolderId } from '@/src/modules/directory/domain/odoo-partner-import'
import { getOdooPublicDriveFieldName } from '@/src/modules/directory/infrastructure/odoo-partner-env'
import {
  isOdooApiConfigured,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

export type ResolveOdooPartnerDriveFolderResult =
  | { ok: true; driveFolderId: string | null }
  | { ok: false }

const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,}$/

/** El campo guarda el ID a secas; se admite también una URL de carpeta por si alguien la pega a mano en Odoo. */
function parsePublicDriveFolderId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (DRIVE_ID_PATTERN.test(trimmed)) return trimmed
  return parseGoogleDriveParentFolderId(trimmed) ?? null
}

/**
 * ID de la carpeta Pública de UN contacto de Odoo, para prellenar el alta una
 * vez elegido. Sale del campo que escribe n8n al crear la carpeta: la cuenta de
 * servicio del portal solo ve las Públicas, no la carpeta padre del cliente,
 * así que no hay forma de encontrarla preguntando a Drive.
 * `driveFolderId: null` = el contacto no tiene el campo relleno.
 */
export async function resolveOdooPartnerDriveFolder(
  odooPartnerId: number
): Promise<ResolveOdooPartnerDriveFolderResult> {
  if (!Number.isInteger(odooPartnerId) || odooPartnerId <= 0) {
    return { ok: false }
  }
  if (!isOdooApiConfigured()) {
    return { ok: true, driveFolderId: null }
  }

  try {
    const field = getOdooPublicDriveFieldName()
    const [row] = await odooSearchRead<{ id: number; [key: string]: unknown }>(
      'res.partner',
      { domain: [['id', '=', odooPartnerId]], fields: [field], limit: 1 }
    )
    return { ok: true, driveFolderId: parsePublicDriveFolderId(row?.[field]) }
  } catch {
    return { ok: false }
  }
}
