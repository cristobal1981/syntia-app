import { useEffect, useState } from 'react'

import type { DriveViewMode } from '@/src/modules/documents/ui/drive-item-card'

const VIEW_MODE_STORAGE_KEY = 'syntia-drive-view-mode'

function readInitialViewMode(): DriveViewMode {
  if (typeof window === 'undefined') return 'grid'
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
  if (stored === 'list' || stored === 'grid') return stored
  return window.matchMedia('(max-width: 639px)').matches ? 'list' : 'grid'
}

/** Preferencia de grid/lista persistida en localStorage, por defecto según el ancho de pantalla. */
export function useDriveViewMode() {
  const [viewMode, setViewModeState] = useState<DriveViewMode>('grid')

  useEffect(() => {
    // localStorage/matchMedia solo existen en cliente — no se puede leer
    // durante SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewModeState(readInitialViewMode())
  }, [])

  function setViewMode(mode: DriveViewMode) {
    setViewModeState(mode)
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  }

  function toggleViewMode() {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid')
  }

  return { viewMode, setViewMode, toggleViewMode }
}
