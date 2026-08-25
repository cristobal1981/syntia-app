import { redirect } from 'next/navigation'

import { getSession } from '@/src/modules/auth/application/get-session'
import { LoginScreen } from '@/src/modules/auth/ui/login-screen'

/**
 * proxy.ts ya rebota lejos de aquí a cualquier rol autenticado según su
 * comprobación superficial (solo firma/caducidad del cookie) — salvo a un
 * `worker`, cuyo token puede parecer válido pero tener el acceso ya
 * revocado (ver get-worker-access-status.ts). Por eso, quien llegue a
 * renderizar esta página es o bien un visitante sin sesión (la comprobación
 * de abajo es barata: ni token, sale rápido) o bien un worker — el único
 * caso donde vale la pena pagar la comprobación profunda, para no dejar
 * atascado en el login a un worker que sí sigue activo.
 */
export default async function LoginPage() {
  const session = await getSession()
  if (session) {
    redirect('/dashboard')
  }

  return <LoginScreen />
}
