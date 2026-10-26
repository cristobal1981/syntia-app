import type { PersonStatus } from '@/src/modules/directory/domain/types'

/**
 * Estado que corresponde al activar o desactivar la cuenta de un cliente: desactivar archiva; activar
 * deja el estado que ya tenía (activo o invitado) y, si estaba archivada, la devuelve a como estaba
 * antes de archivarla: activa si el cliente ya tenía su cuenta de acceso (ya entró alguna vez, tiene
 * su contraseña y puede cambiarla él mismo), invitada si nunca llegó a entrar. No se envía ningún
 * correo: «invitado» pasa a activo solo cuando el cliente entra.
 */
export function nextClientStatus(
  current: PersonStatus | undefined,
  active: boolean,
  hasAccessAccount = false
): PersonStatus {
  if (!active) return 'archived'
  if (current && current !== 'archived') return current
  return hasAccessAccount ? 'active' : 'invited'
}
