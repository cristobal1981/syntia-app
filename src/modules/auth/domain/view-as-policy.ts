import type { PortalRole } from '@/src/modules/auth/domain/types'

/**
 * Quién puede ver el portal como un cliente: el admin, a cualquiera; el
 * asesor, solo a los clientes que tiene asignados. Cliente y colaborador,
 * a nadie.
 */
export function canStaffViewClient(
  staff: { role: PortalRole; actorId: string },
  client: { advisorId?: string | null }
): boolean {
  if (staff.role === 'admin') return true
  if (staff.role === 'advisor') {
    return Boolean(client.advisorId) && client.advisorId === staff.actorId
  }
  return false
}

const SAFE_METHODS: ReadonlySet<string> = new Set(['GET', 'HEAD', 'OPTIONS'])

/** La vista como cliente es de solo lectura: cualquier otro método se rechaza. */
export function isWriteMethod(method: string): boolean {
  return !SAFE_METHODS.has(method.toUpperCase())
}
