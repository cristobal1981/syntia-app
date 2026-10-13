'use client'

import { useRouter } from 'next/navigation'

import type {
  DriveErrorContext,
  DriveUiErrorCode,
} from '@/src/modules/documents/domain/drive-error-presentation'
import { DriveErrorNotice } from '@/src/modules/documents/ui/drive-error-notice'

/** Aviso de error al cargar la sección desde el servidor; «Reintentar» vuelve a pedir la página. */
export function DocumentsLoadError({
  code,
  context = 'load',
}: {
  code: DriveUiErrorCode
  context?: DriveErrorContext
}) {
  const router = useRouter()
  return (
    <DriveErrorNotice variant="panel" code={code} context={context} onRetry={() => router.refresh()} />
  )
}
