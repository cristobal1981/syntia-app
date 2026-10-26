import type { PushSupport } from '@/src/modules/push/domain/push-support'

/** Lo que el aviso de «activa las notificaciones» necesita saber del dispositivo. */
export type PushPromptState =
  | { kind: 'loading' }
  | { kind: 'unsupported'; support: Exclude<PushSupport, 'supported'> }
  | { kind: 'denied' }
  | { kind: 'off' }
  | { kind: 'on' }

/**
 * Qué aviso se enseña en este dispositivo: `enable` (se pueden activar ahora),
 * `install` (iPhone/iPad sin instalar: primero hay que instalar la app) o ninguno.
 * Sale una sola vez por dispositivo y cuenta: `dismissed` es `null` hasta leer el
 * almacenamiento local, y mientras tanto no se enseña nada (evita el parpadeo).
 */
export function resolvePushPrompt(input: {
  configured: boolean
  state: PushPromptState
  dismissed: boolean | null
}): 'enable' | 'install' | null {
  if (!input.configured || input.dismissed !== false) return null

  if (input.state.kind === 'off') return 'enable'
  if (input.state.kind === 'unsupported' && input.state.support === 'install-required') {
    return 'install'
  }
  return null
}
