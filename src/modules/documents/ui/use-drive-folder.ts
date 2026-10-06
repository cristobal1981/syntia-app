import { useCallback, useState, useTransition } from 'react'

import { clientDocuments } from '@/content/client-documents'
import {
  createDriveFolderAction,
  deleteDriveItemAction,
  downloadDriveFileAction,
  listDriveFolderAction,
  moveDriveItemAction,
  renameDriveItemAction,
  uploadDriveFilesAction,
} from '@/src/modules/documents/application/portal-drive-document-actions'
import type { DriveBreadcrumb, DriveItem } from '@/src/modules/documents/domain/types'
import { triggerBase64Download } from '@/src/modules/portal/lib/trigger-base64-download'
import {
  dedupedServerAction,
  serverActionDedupKey,
} from '@/src/modules/portal/infrastructure/server-action-dedup'

function errorMessage(code: keyof typeof clientDocuments.errors): string {
  return clientDocuments.errors[code] ?? clientDocuments.errors.drive_unavailable
}

/**
 * Posesión exclusiva del listado de la carpeta actual y de todas las
 * operaciones que la mutan (subir, renombrar, borrar, mover, crear
 * subcarpeta) — el estado de presentación de los diálogos (qué item se está
 * renombrando, el valor del input...) se queda en `DriveBrowser`, que llama
 * a estas funciones con argumentos explícitos en vez de dejarles leer ese
 * estado por closure.
 */
export function useDriveFolder() {
  const [items, setItems] = useState<DriveItem[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<DriveBreadcrumb[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busyItemId, setBusyItemId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const loadFolder = useCallback(async (folderId?: string) => {
    setLoading(true)
    setError(null)
    setActionError(null)

    const dedupKey = serverActionDedupKey('listDriveFolder', { folderId: folderId ?? '' })
    const result = await dedupedServerAction(dedupKey, () =>
      listDriveFolderAction(folderId ? { folderId } : undefined)
    )

    setLoading(false)

    if (!result.ok) {
      setItems([])
      setBreadcrumbs([])
      setCurrentFolderId(null)
      setError(errorMessage(result.error))
      return
    }

    setItems(result.listing.items)
    setBreadcrumbs(result.listing.breadcrumbs)
    setCurrentFolderId(result.listing.currentFolderId)
  }, [])

  const download = useCallback((item: DriveItem) => {
    setActionError(null)
    setBusyItemId(item.id)

    startTransition(async () => {
      const result = await downloadDriveFileAction({ fileId: item.id })
      setBusyItemId(null)

      if (!result.ok) {
        setActionError(errorMessage(result.error))
        return
      }

      triggerBase64Download(result.filename, result.mimetype, result.dataBase64)
    })
  }, [])

  const upload = useCallback(
    (
      files: FileList | File[],
      folderId: string,
      options?: { onPhaseChange?: (phase: 'uploading' | 'success' | 'idle') => void }
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
        const result = await uploadDriveFilesAction(formData)
        setUploading(false)

        if (!result.ok) {
          options?.onPhaseChange?.('idle')
          setActionError(errorMessage(result.error))
          return
        }

        options?.onPhaseChange?.('success')
        await loadFolder(folderId)
        window.setTimeout(() => options?.onPhaseChange?.('idle'), 1500)
      })
    },
    [loadFolder]
  )

  const rename = useCallback(
    (itemId: string, newName: string, onDone: () => void) => {
      setActionError(null)
      setBusyItemId(itemId)

      startTransition(async () => {
        const result = await renameDriveItemAction({ itemId, newName })
        setBusyItemId(null)

        if (!result.ok) {
          setActionError(errorMessage(result.error))
          return
        }

        onDone()
        if (currentFolderId) {
          await loadFolder(currentFolderId)
        }
      })
    },
    [currentFolderId, loadFolder]
  )

  const remove = useCallback(
    (itemId: string, onDone: () => void) => {
      if (!currentFolderId) return

      setActionError(null)
      setBusyItemId(itemId)

      startTransition(async () => {
        const result = await deleteDriveItemAction({ itemId })
        setBusyItemId(null)

        if (!result.ok) {
          setActionError(errorMessage(result.error))
          return
        }

        onDone()
        await loadFolder(currentFolderId)
      })
    },
    [currentFolderId, loadFolder]
  )

  const move = useCallback(
    (itemId: string, targetFolderId: string, onDone: () => void) => {
      if (!currentFolderId) return

      setActionError(null)
      setBusyItemId(itemId)

      startTransition(async () => {
        const result = await moveDriveItemAction({
          itemId,
          targetFolderId,
          sourceFolderId: currentFolderId,
        })
        setBusyItemId(null)

        if (!result.ok) {
          setActionError(errorMessage(result.error))
          return
        }

        onDone()
        await loadFolder(currentFolderId)
      })
    },
    [currentFolderId, loadFolder]
  )

  const createFolder = useCallback(
    (name: string, onDone: () => void) => {
      if (!currentFolderId) return

      setActionError(null)

      startTransition(async () => {
        const result = await createDriveFolderAction({
          parentFolderId: currentFolderId,
          name,
        })

        if (!result.ok) {
          setActionError(errorMessage(result.error))
          return
        }

        onDone()
        await loadFolder(currentFolderId)
      })
    },
    [currentFolderId, loadFolder]
  )

  return {
    items,
    breadcrumbs,
    currentFolderId,
    loading,
    error,
    uploading,
    actionError,
    setActionError,
    busyItemId,
    setBusyItemId,
    pending,
    loadFolder,
    download,
    upload,
    rename,
    remove,
    move,
    createFolder,
  }
}
