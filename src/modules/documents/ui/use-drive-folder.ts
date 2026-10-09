import { useCallback, useEffect, useRef, useState, useTransition } from 'react'

import {
  downloadDriveFileAction,
  listDriveFolderAction,
  uploadDriveFilesAction,
} from '@/src/modules/documents/application/portal-drive-document-actions'
import type {
  DriveErrorContext,
  DriveUiErrorCode,
} from '@/src/modules/documents/domain/drive-error-presentation'
import {
  planFolderLoadFailure,
  type FolderLoadFailurePlan,
} from '@/src/modules/documents/domain/drive-stale-recovery'
import type { DriveBreadcrumb, DriveDuplicate, DriveItem } from '@/src/modules/documents/domain/types'
import { callDriveAction } from '@/src/modules/documents/ui/call-drive-action'
import { triggerBase64Download } from '@/src/modules/portal/lib/trigger-base64-download'
import {
  dedupedServerAction,
  serverActionDedupKey,
} from '@/src/modules/portal/infrastructure/server-action-dedup'

export type DriveFolderError = { code: DriveUiErrorCode; context: DriveErrorContext }

/**
 * Posesión exclusiva del listado de la carpeta actual y de las únicas
 * operaciones permitidas al cliente: listar, descargar y subir. No existe
 * renombrar, mover, eliminar ni crear carpetas (tampoco en el servidor).
 *
 * Drive puede cambiar por detrás (el staff mueve o borra cosas). Ningún fallo
 * deja a la persona sin lista si ya tenía una: se conserva, se avisa con un
 * mensaje claro y, si lo que falló es "ya no existe", se sincroniza sola.
 */
export function useDriveFolder() {
  const [items, setItems] = useState<DriveItem[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<DriveBreadcrumb[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<DriveFolderError | null>(null)
  const [uploading, setUploading] = useState(false)
  const [actionError, setActionError] = useState<DriveFolderError | null>(null)
  const [busyItemId, setBusyItemId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Los planes de recuperación leen el estado más reciente sin recrear callbacks.
  const stateRef = useRef({ currentFolderId, hasListing: false })
  useEffect(() => {
    stateRef.current = { currentFolderId, hasListing: breadcrumbs.length > 0 }
  }, [currentFolderId, breadcrumbs.length])

  /** Una carga de carpeta; devuelve la sincronización automática que procede si falló. */
  const applyLoad = useCallback(
    async (
      folderId?: string,
      options?: { silent?: boolean }
    ): Promise<FolderLoadFailurePlan['fallback']> => {
      if (!options?.silent) setLoading(true)
      setError(null)
      if (!options?.silent) setActionError(null)

      const dedupKey = serverActionDedupKey('listDriveFolder', { folderId: folderId ?? '' })
      const result = await callDriveAction(() =>
        dedupedServerAction(dedupKey, () =>
          listDriveFolderAction(folderId ? { folderId } : undefined)
        )
      )

      setLoading(false)

      if (result.ok) {
        setItems(result.listing.items)
        setBreadcrumbs(result.listing.breadcrumbs)
        setCurrentFolderId(result.listing.currentFolderId)
        return 'none'
      }

      const plan = planFolderLoadFailure({
        code: result.error,
        requestedFolderId: folderId,
        currentFolderId: stateRef.current.currentFolderId,
        hasListing: stateRef.current.hasListing,
      })

      if (plan.listing === 'clear') {
        setItems([])
        setBreadcrumbs([])
        setCurrentFolderId(null)
        setError({ code: result.error, context: plan.context })
        return 'none'
      }

      setActionError({ code: result.error, context: plan.context })
      return plan.fallback
    },
    []
  )

  const loadFolder = useCallback(
    async (folderId?: string, options?: { silent?: boolean }): Promise<void> => {
      const fallback = await applyLoad(folderId, options)
      // La sincronización automática se intenta una sola vez (sin bucles).
      if (fallback === 'refresh-current' && stateRef.current.currentFolderId) {
        await applyLoad(stateRef.current.currentFolderId, { silent: true })
      } else if (fallback === 'go-home') {
        await applyLoad(undefined, { silent: true })
      }
    },
    [applyLoad]
  )

  /** Fallo en una acción sobre un elemento: se avisa y, si ya no existe, se resincroniza la lista. */
  const failAction = useCallback(
    (code: DriveUiErrorCode, context: DriveErrorContext) => {
      setActionError({ code, context })
      if (code === 'not_found') {
        const folderId = stateRef.current.currentFolderId
        if (folderId) void loadFolder(folderId, { silent: true })
      }
    },
    [loadFolder]
  )

  const download = useCallback(
    (item: DriveItem) => {
      setActionError(null)
      setBusyItemId(item.id)

      startTransition(async () => {
        const result = await callDriveAction(() => downloadDriveFileAction({ fileId: item.id }))
        setBusyItemId(null)

        if (!result.ok) {
          failAction(result.error, 'file')
          return
        }

        try {
          triggerBase64Download(result.filename, result.mimetype, result.dataBase64)
        } catch {
          failAction('unexpected', 'file')
        }
      })
    },
    [failAction]
  )

  const upload = useCallback(
    (
      files: FileList | File[],
      folderId: string,
      options?: {
        onPhaseChange?: (phase: 'uploading' | 'success' | 'idle') => void
        /** Archivo repetido: se avisa con la tarjeta del cuadro de subida, no con texto suelto. */
        onDuplicate?: (duplicate: DriveDuplicate) => void
      }
    ) => {
      const fileArray = Array.from(files)
      if (!fileArray.length) return

      setUploading(true)
      options?.onPhaseChange?.('uploading')
      setActionError(null)

      const formData = new FormData()
      formData.set('parentFolderId', folderId)
      for (const file of fileArray) {
        formData.append('files', file)
      }

      startTransition(async () => {
        const result = await callDriveAction(() => uploadDriveFilesAction(formData))
        setUploading(false)

        if (!result.ok) {
          const duplicate = 'duplicate' in result ? result.duplicate : undefined
          if (result.error === 'duplicate' && duplicate && options?.onDuplicate) {
            options.onDuplicate(duplicate)
            return
          }
          options?.onPhaseChange?.('idle')
          failAction(result.error, 'upload')
          return
        }

        options?.onPhaseChange?.('success')
        await loadFolder(folderId, { silent: true })
        window.setTimeout(() => options?.onPhaseChange?.('idle'), 1500)
      })
    },
    [failAction, loadFolder]
  )

  return {
    items,
    breadcrumbs,
    currentFolderId,
    loading,
    error,
    uploading,
    actionError,
    clearActionError: () => setActionError(null),
    setActionError,
    busyItemId,
    setBusyItemId,
    pending,
    loadFolder,
    failAction,
    download,
    upload,
  }
}
