import type { PersonStatus } from '@/src/modules/directory/domain/types'

/**
 * Estado que corresponde al activar o desactivar la cuenta de un cliente con el interruptor:
 * desactivar archiva; activar deja el estado que ya tenía (activo o invitado) y, si estaba
 * archivada, la vuelve a invitar. «Invitado» lo gestiona la app: pasa a activo sola cuando el
 * cliente entra por primera vez.
 */
export function nextClientStatus(
  current: PersonStatus | undefined,
  active: boolean
): PersonStatus {
  if (!active) return 'archived'
  return current && current !== 'archived' ? current : 'invited'
}
