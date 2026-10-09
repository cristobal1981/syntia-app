'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { clientDocuments } from '@/content/client-documents'
import {
  DRIVE_REFRESH_SHORTCUT,
  DRIVE_TOGGLE_VIEW_SHORTCUT,
  DRIVE_UPLOAD_SHORTCUT,
} from '@/src/modules/documents/domain/drive-shortcuts'
import { sortDriveItems } from '@/src/modules/documents/domain/sort-drive-items'
import type { DriveDuplicate, DriveItem } from '@/src/modules/documents/domain/types'

import { isExternalFileDrag } from '@/src/modules/documents/ui/drive-drag'
import type { DriveDropOverlayUploadPhase } from '@/src/modules/documents/ui/drive-drop-overlay'
import { useDriveFolder } from '@/src/modules/documents/ui/use-drive-folder'
import { useDriveViewMode } from '@/src/modules/documents/ui/use-drive-view-mode'
import { useExternalFileDragOverlay } from '@/src/modules/documents/ui/use-external-file-drag-overlay'
import { buildPortalShortcutTooltipCopy } from '@/src/modules/portal/domain/portal-shortcut-platform'
import { formatPortalShortcutLabel, isPortalShortcutBlockedTarget } from '@/src/modules/portal/domain/portal-shortcuts'
import { usePortalShortcutOverlay } from '@/src/modules/portal/ui/portal-shortcut-overlay-context'
import { usePortalShortcut } from '@/src/modules/portal/ui/use-portal-shortcut'

export function useDriveBrowser(canWrite: boolean) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const driveFolder = useDriveFolder()
  const { viewMode, setViewMode, toggleViewMode } = useDriveViewMode()
  const { pageDragActive, resetPageDrag } = useExternalFileDragOverlay(canWrite)

  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const q = searchParams.get('q')
    if (!q) return

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchQuery(q)
    router.replace('/documentos', { scroll: false })
  }, [router, searchParams])

  const [uploadOverlayPhase, setUploadOverlayPhase] =
    useState<DriveDropOverlayUploadPhase>('idle')
  const [duplicate, setDuplicate] = useState<DriveDuplicate | null>(null)
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

  useEffect(() => {
    // Dispara la carga inicial de la carpeta (patrón fetch-on-mount).
    void loadFolder()
  }, [loadFolder])

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('es')
    const matched = query
      ? items.filter((item) => item.name.toLocaleLowerCase('es').includes(query))
      : items
    return sortDriveItems(matched)
  }, [items, searchQuery])

  function handleRefresh() {
    if (loading) return
    void loadFolder(currentFolderId ?? undefined)
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
    void loadFolder(item.id)
    setSearchQuery('')
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
    driveFolder.upload(files, folderId, {
      onPhaseChange: setUploadOverlayPhase,
      onDuplicate: (found) => {
        setDuplicate(found)
        setUploadOverlayPhase('duplicate')
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

  function dismissDuplicate() {
    setDuplicate(null)
    setUploadOverlayPhase('idle')
  }

  function handleGoHome() {
    clearSelection()
    clearActionError()
    setSearchQuery('')
    void loadFolder()
  }

  /** Un archivo abierto ya no existe: se resincroniza la lista sin parpadeo. */
  function handleFileUnavailable() {
    if (currentFolderId) void loadFolder(currentFolderId, { silent: true })
  }

  function handleBreadcrumbNavigate(folderId: string) {
    clearSelection()
    void loadFolder(folderId)
    setSearchQuery('')
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
    dismissDuplicate,
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
