'use client'

import { useEffect } from 'react'

import { DriveErrorNotice } from '@/src/modules/documents/ui/drive-error-notice'

/**
 * Red de seguridad de la sección: si algo revienta al renderizar Documentos
 * (algo que no sea una respuesta de Drive, que ya se controla), la persona ve un
 * aviso dentro del portal con salida, no la pantalla de error global.
 */
export default function DocumentosError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return <DriveErrorNotice variant="panel" code="unexpected" context="load" onRetry={reset} />
}
