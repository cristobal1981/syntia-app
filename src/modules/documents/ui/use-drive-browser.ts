'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { clientDocuments } from '@/content/client-documents'
import {
  DRIVE_REFRESH_SHORTCUT,
  DRIVE_TOGGLE_VIEW_SHORTCUT,
  DRIVE_UPLOAD_SHORTCUT,
} from '@/src/modules/documents/domain/drive-shortcuts'
import { DRIVE_DOCUMENTS_CHANGED_EVENT } from '@/src/modules/documents/domain/drive-events'
import { buildFolderUrl, parseFolderParam } from '@/src/modules/documents/domain/drive-folder-url'
import { sortDriveItems } from '@/src/modules/documents/domain/sort-drive-items'
import type {
  DriveDuplicate,
  DriveFolderListing,
  DriveItem,
} from '@/src/modules/documents/domain/types'

import type { DriveUiErrorCode } from '@/src/modules/documents/domain/drive-error-presentation'
import { isExternalFileDrag } from '@/src/modules/documents/ui/drive-drag'
import type { DriveDropOverlayUploadPhase } from '@/src/modules/documents/ui/drive-drop-overlay'
import { useDriveFolder } from '@/src/modules/documents/ui/use-drive-folder'
import { useDriveViewMode } from '@/src/modules/documents/ui/use-drive-view-mode'
import { useExternalFileDragOverlay } from '@/src/modules/documents/ui/use-external-file-drag-overlay'
import { buildPortalShortcutTooltipCopy } from '@/src/modules/portal/domain/portal-shortcut-platform'
import { formatPortalShortcutLabel, isPortalShortcutBlockedTarget } from '@/src/modules/portal/domain/portal-shortcuts'
import { usePortalShortcutOverlay } from '@/src/modules/portal/ui/portal-shortcut-overlay-context'
import { usePortalShortcut } from '@/src/modules/portal/ui/use-portal-shortcut'

/**
 * Orquesta el explorador de Documentos: carpeta (fuente de verdad en la URL),
 * búsqueda, selección, vista previa, subida y atajos. `canWrite` desactiva
 * subida y arrastre; la UI solo consume lo que devuelve.
 */
export function useDriveBrowser(canWrite: boolean, initialListing?: DriveFolderListing) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const driveFolder = useDriveFolder(initialListing)
  const { viewMode, setViewMode, toggleViewMode } = useDriveViewMode()
  const { pageDragActive, resetPageDrag } = useExternalFileDragOverlay(canWrite)

  const [searchQuery, setSearchQuery] = useState('')
  // La carpeta actual vive en la URL (`?carpeta=<id>`); sin parámetro es Inicio.
  const folderParam = parseFolderParam(searchParams.get('carpeta'))

  useEffect(() => {
    const q = searchParams.get('q')
    if (!q) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery(q)
    router.replace(buildFolderUrl('/documentos', '', folderParam), { scroll: false })
  }, [router, searchParams, folderParam])

  const [uploadOverlayPhase, setUploadOverlayPhase] =
    useState<DriveDropOverlayUploadPhase>('idle')
  const [duplicate, setDuplicate] = useState<DriveDuplicate | null>(null)
  const [uploadRejection, setUploadRejection] = useState<DriveUiErrorCode | null>(null)
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const {
    items,
    breadcrumbs,
    currentFolderId,
    loading,
    error,
    uploading,
    actionError,
    clearActionError,
    busyItemId,
    pending,
    loadFolder,
  } = driveFolder

  const overlayActive = usePortalShortcutOverlay()
  const dialogOpen = previewOpen

  const uploadShortcutLabel = formatPortalShortcutLabel(DRIVE_UPLOAD_SHORTCUT)
  const toggleViewShortcutLabel = formatPortalShortcutLabel(DRIVE_TOGGLE_VIEW_SHORTCUT)
  const refreshShortcutLabel = formatPortalShortcutLabel(DRIVE_REFRESH_SHORTCUT)

  const uploadTooltip = buildPortalShortcutTooltipCopy(
    clientDocuments.shortcuts.upload,
    clientDocuments.upload,
    uploadShortcutLabel
  )
  const refreshTooltip = buildPortalShortcutTooltipCopy(
    clientDocuments.shortcuts.refresh,
    clientDocuments.refresh,
    refreshShortcutLabel
  )
  const gridViewTooltip = buildPortalShortcutTooltipCopy(
    clientDocuments.shortcuts.toggleView,
    clientDocuments.viewGrid,
    toggleViewShortcutLabel
  )

  function clearSelection() {
    setSelectedItemId(null)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      if (isPortalShortcutBlockedTarget(event.target)) return
      clearSelection()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const rootFolderId = breadcrumbs[0]?.id ?? null
  const shownRef = useRef({ currentFolderId, rootFolderId })
  useEffect(() => {
    shownRef.current = { currentFolderId, rootFolderId }
  }, [currentFolderId, rootFolderId])

  // Una subida hecha fuera del explorador (factura rápida): se refresca la carpeta
  // en segundo plano para que aparezca sin recargar.
  useEffect(() => {
    const onChanged = () => {
      void loadFolder(shownRef.current.currentFolderId ?? undefined, { silent: true })
    }
    window.addEventListener(DRIVE_DOCUMENTS_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(DRIVE_DOCUMENTS_CHANGED_EVENT, onChanged)
  }, [loadFolder])

  // Carpeta cuya carga (incluida su recuperación automática) ya terminó.
  const [settledParam, setSettledParam] = useState<string | null | undefined>(undefined)

  // La URL manda: carga inicial, atrás/adelante y enlaces pasan por aquí.
  useEffect(() => {
    const shown = shownRef.current
    const alreadyShown =
      shown.currentFolderId !== null &&
      (folderParam === null
        ? shown.currentFolderId === shown.rootFolderId
        : shown.currentFolderId === folderParam)
    if (alreadyShown) return

    let current = true
    void loadFolder(folderParam ?? undefined).then(() => {
      if (current) setSettledParam(folderParam)
    })
    return () => {
      current = false
    }
  }, [folderParam, loadFolder])

  // Si la carga acabó en otra carpeta (la pedida ya no existe → Inicio), la URL
  // se corrige sin añadir una entrada al historial.
  useEffect(() => {
    if (settledParam !== folderParam || loading || !currentFolderId || !rootFolderId) return
    const expected = currentFolderId === rootFolderId ? null : currentFolderId
    if (expected === folderParam) return
    window.history.replaceState(
      null,
      '',
      buildFolderUrl(window.location.pathname, window.location.search, expected)
    )
  }, [settledParam, folderParam, loading, currentFolderId, rootFolderId])

  function pushFolderUrl(folderId: string | null) {
    const url = buildFolderUrl(window.location.pathname, window.location.search, folderId)
    if (url === `${window.location.pathname}${window.location.search}`) return false
    window.history.pushState(null, '', url)
    return true
  }

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('es')
    const matched = query
      ? items.filter((item) => item.name.toLocaleLowerCase('es').includes(query))
      : items
    return sortDriveItems(matched)
  }, [items, searchQuery])

  function handleRefresh() {
    if (loading) return
    void loadFolder(currentFolderId ?? undefined, { fresh: true })
  }

  function handleUploadClick() {
    if (!canWrite || loading || uploading || !currentFolderId) return
    fileInputRef.current?.click()
  }

  usePortalShortcut(DRIVE_REFRESH_SHORTCUT, handleRefresh, {
    enabled: !loading && !dialogOpen,
  })
  usePortalShortcut(DRIVE_UPLOAD_SHORTCUT, handleUploadClick, {
    enabled: canWrite && !loading && !uploading && !dialogOpen && Boolean(currentFolderId),
  })
  usePortalShortcut(DRIVE_TOGGLE_VIEW_SHORTCUT, toggleViewMode, {
    enabled: !loading && !dialogOpen,
  })

  function handleOpenFolder(item: DriveItem) {
    if (item.kind !== 'folder') return
    setSearchQuery('')
    if (!pushFolderUrl(item.id)) void loadFolder(item.id)
  }

  function handleOpenFile(item: DriveItem) {
    if (item.kind === 'folder') return
    setPreviewItem(item)
    setPreviewOpen(true)
  }

  function handleUpload(files: FileList | File[], targetFolderId?: string) {
    if (!canWrite) return
    const folderId = targetFolderId ?? currentFolderId
    if (!folderId) return

    resetPageDrag()
    setDuplicate(null)
    setUploadRejection(null)
    driveFolder.upload(files, folderId, {
      onPhaseChange: setUploadOverlayPhase,
      onDuplicate: (found) => {
        setDuplicate(found)
        setUploadOverlayPhase('duplicate')
      },
      onRejected: (code) => {
        setUploadRejection(code)
        setUploadOverlayPhase('rejected')
      },
    })
  }

  function handlePageDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!isExternalFileDrag(event) || !currentFolderId) return
    event.preventDefault()
    resetPageDrag()
    if (event.dataTransfer.files.length > 0) {
      handleUpload(event.dataTransfer.files, currentFolderId)
    }
  }

  function handleDownloadItem(item: DriveItem) {
    driveFolder.download(item)
  }

  function dismissUploadNotice() {
    setDuplicate(null)
    setUploadRejection(null)
    setUploadOverlayPhase('idle')
  }

  function handleGoHome() {
    clearSelection()
    clearActionError()
    setSearchQuery('')
    if (!pushFolderUrl(null)) void loadFolder()
  }

  /** Un archivo abierto ya no existe: se resincroniza la lista sin parpadeo. */
  function handleFileUnavailable() {
    if (currentFolderId) void loadFolder(currentFolderId, { silent: true })
  }

  function handleBreadcrumbNavigate(folderId: string) {
    clearSelection()
    setSearchQuery('')
    const target = folderId === rootFolderId ? null : folderId
    if (!pushFolderUrl(target)) void loadFolder(folderId)
  }

  return {
    fileInputRef,
    breadcrumbs,
    filteredItems,
    currentFolderId,
    loading,
    error,
    uploading,
    actionError,
    clearActionError,
    busyItemId,
    pending,
    viewMode,
    setViewMode,
    pageDragActive,
    uploadOverlayPhase,
    duplicate,
    uploadRejection,
    dismissUploadNotice,
    searchQuery,
    setSearchQuery,
    previewItem,
    previewOpen,
    setPreviewOpen,
    setPreviewItem,
    selectedItemId,
    setSelectedItemId,
    overlayActive,
    uploadTooltip,
    refreshTooltip,
    gridViewTooltip,
    uploadShortcutLabel,
    toggleViewShortcutLabel,
    refreshShortcutLabel,
    clearSelection,
    handleRefresh,
    handleUploadClick,
    handleOpenFolder,
    handleOpenFile,
    handleUpload,
    handlePageDrop,
    handleDownloadItem,
    handleBreadcrumbNavigate,
    handleGoHome,
    handleFileUnavailable,
  }
}
