'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type ProfileChangeDrawerState = {
  open: boolean
  setOpen: (open: boolean) => void
  /** El drawer ya está montado (llegaron los datos del perfil): hasta entonces el botón no hace nada. */
  ready: boolean
  setReady: (ready: boolean) => void
}

const ProfileChangeDrawerContext = createContext<ProfileChangeDrawerState | null>(null)

/**
 * Une la cabecera de Perfil (que se pinta antes que los datos) con el drawer de
 * cambios (que necesita el perfil y llega por streaming).
 */
export function ProfileChangeDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [ready, setReady] = useState(false)
  const value = useMemo(() => ({ open, setOpen, ready, setReady }), [open, ready])

  return (
    <ProfileChangeDrawerContext.Provider value={value}>
      {children}
    </ProfileChangeDrawerContext.Provider>
  )
}

/** `null` fuera del proveedor (p. ej. en la pantalla de carga). */
export function useProfileChangeDrawer(): ProfileChangeDrawerState | null {
  return useContext(ProfileChangeDrawerContext)
}
