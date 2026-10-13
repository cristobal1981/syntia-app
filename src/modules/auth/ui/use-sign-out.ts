'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'

import { portal } from '@/content/portal'
import { waitRemainingMinDuration } from '@/lib/wait-min-display'
import { signOutAction } from '@/src/modules/auth/application/sign-out'

/**
 * Cierre de sesión con la despedida a pantalla completa. El estado vive en
 * quien llama a este hook, no en un panel que se cierra: si el botón estuviera
 * dentro de un menú desplegable, cerrarlo desmontaría la despedida.
 */
export function useSignOut() {
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [pending, startTransition] = useTransition()

  // Con Cache Components el layout del portal se conserva oculto al salir a /login y
  // reaparece intacto al volver a entrar; sin este reset el overlay de despedida
  // seguiría montado con `signingOut` en true.
  useEffect(() => () => setSigningOut(false), [])

  const signOut = () => {
    if (pending || signingOut) return

    setSigningOut(true)
    const startedAt = Date.now()

    startTransition(async () => {
      try {
        await signOutAction()
        await waitRemainingMinDuration(startedAt, portal.authLoading.signOutMinDisplayMs)
        router.push('/login')
        router.refresh()
      } catch {
        setSigningOut(false)
      }
    })
  }

  return { signOut, signingOut, busy: pending || signingOut }
}
