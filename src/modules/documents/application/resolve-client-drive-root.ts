import type { PortalUser } from '@/src/modules/auth/domain/types'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import { getClientIntegrationByUserId } from '@/src/modules/directory/infrastructure/client-integrations.supabase'

/**
 * Carpeta Pública de Drive del cliente. Se lee siempre de la base de datos, sin
 * caché: es la decisión de acceso, y quitar o cambiar el id debe surtir efecto
 * en la siguiente acción (una caché dejaba subir y listar con el id antiguo).
 */
export async function resolveClientDriveRootId(
  user: PortalUser
): Promise<string | null> {
  const portalUserId = await resolveDirectoryActorId(user)
  const integration = await getClientIntegrationByUserId(portalUserId)
  return integration?.drive_folder_id?.trim() || null
}
