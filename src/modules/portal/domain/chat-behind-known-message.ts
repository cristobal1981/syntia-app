import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'

/** Lo máximo que se hace esperar al esqueleto a que llegue el mensaje del aviso. */
export const BEHIND_KNOWN_MAX_WAIT_MS = 6_000

/**
 * ¿La conversación guardada va por detrás de lo que ya sabemos que existe? Un aviso (push,
 * campana) trae el id de su último mensaje: si la copia guardada del chat no lo tiene, enseñarla
 * tal cual y colar el mensaje 1-2 s después se ve como un salto. Con `true`, el chat mantiene el
 * esqueleto hasta pedir lo posterior. Sin id conocido (o sin mensajes guardados) no hay con qué
 * comparar y no se espera.
 */
export function isChatBehindKnownMessage(
  messages: Pick<PortalChatterMessage, 'id'>[],
  latestKnownMessageId: number | undefined,
): boolean {
  if (!latestKnownMessageId) return false
  if (messages.length === 0) return false
  const newestLoaded = Math.max(...messages.map((message) => message.id))
  return latestKnownMessageId > newestLoaded
}

/** Espera a `promise` como mucho `ms`; si tarda más (o falla) sigue sin lanzar. */
export async function waitAtMost(promise: Promise<unknown>, ms: number): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    await Promise.race([
      promise.catch(() => undefined),
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, ms)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
