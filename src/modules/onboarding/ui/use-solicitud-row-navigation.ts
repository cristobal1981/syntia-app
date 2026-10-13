'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export function useSolicitudRowNavigation() {
  const router = useRouter()
  const pathname = usePathname()
  const [navigatingToken, setNavigatingToken] = useState<string | null>(null)
  // Ajuste durante el render (no en un efecto): limpia el estado "navegando"
  // en cuanto la URL realmente cambia (navegación confirmada).
  const [prevPathname, setPrevPathname] = useState(pathname)
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setNavigatingToken(null)
  }

  function handleRowOpen(token: string) {
    if (navigatingToken) return
    setNavigatingToken(token)
    router.push(`/solicitudes/${token}`)
  }

  return { navigatingToken, handleRowOpen }
}
