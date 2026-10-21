export type PushSupport =
  | 'supported'
  /** iPhone/iPad en Safari: el push solo existe con la app instalada. */
  | 'install-required'
  | 'unsupported'

export function detectPushSupport(env: {
  hasServiceWorker: boolean
  hasPushManager: boolean
  hasNotification: boolean
  isIos: boolean
  isStandalone: boolean
}): PushSupport {
  if (env.hasServiceWorker && env.hasPushManager && env.hasNotification) {
    return 'supported'
  }
  if (env.isIos && !env.isStandalone) return 'install-required'
  return 'unsupported'
}

/** Clave pública VAPID (base64url) al formato que pide `pushManager.subscribe`. */
export function urlBase64ToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const output = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}
