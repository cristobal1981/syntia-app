import {
  reconcilePushSubscriptionAction,
  unsubscribePushAction,
} from '@/src/modules/push/application/push-subscription-actions'

async function currentSubscription(): Promise<PushSubscription | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.getRegistration('/sw.js')
  return (await registration?.pushManager.getSubscription()) ?? null
}

/**
 * Da de baja el push de ESTE navegador (en el servidor y en el navegador). Se
 * llama al cerrar sesión, con la sesión aún válida, para que la suscripción no
 * pase a la siguiente persona que use el navegador. Nunca lanza: cerrar sesión
 * no debe depender de esto.
 */
export async function removePushFromThisDevice(): Promise<void> {
  try {
    const subscription = await currentSubscription()
    if (!subscription) return
    await unsubscribePushAction(subscription.endpoint)
    await subscription.unsubscribe()
  } catch {
    // Si falla, el guardián la dará de baja al entrar el siguiente usuario.
  }
}

/**
 * Al abrir el portal: si el navegador tiene una suscripción que no es de la
 * sesión actual (la dejó otro usuario), se da de baja en el navegador. Con un
 * error al comprobar no se hace nada.
 */
export async function dropForeignPushSubscription(): Promise<void> {
  try {
    const subscription = await currentSubscription()
    if (!subscription) return
    const result = await reconcilePushSubscriptionAction(subscription.endpoint)
    if (result.ok && !result.owned) await subscription.unsubscribe()
  } catch {
    // Sin conexión o sin permiso: se reintenta en la próxima carga.
  }
}
