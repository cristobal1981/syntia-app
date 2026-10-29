import {
  syncPushSubscriptionAction,
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

/** Lo que el servidor necesita de una suscripción del navegador (la forma de `subscribePushAction`). */
export function subscriptionToInput(subscription: PushSubscription) {
  const json = subscription.toJSON()
  return {
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    userAgent: navigator.userAgent,
  }
}

/**
 * Al abrir el portal: el navegador manda su suscripción y el servidor la renueva, o la recupera si
 * la había perdido. Solo si es de otra persona (la dejó otro usuario) se da de baja en el
 * navegador. Con cualquier otra respuesta o error no se hace nada: dar de baja por error obliga a
 * reactivar las notificaciones.
 */
export async function syncThisDevicePush(): Promise<void> {
  try {
    const subscription = await currentSubscription()
    if (!subscription) return
    const result = await syncPushSubscriptionAction(subscriptionToInput(subscription))
    if (result.ok && result.status === 'foreign') await subscription.unsubscribe()
  } catch {
    // Sin conexión o sin permiso: se reintenta en la próxima carga.
  }
}
