'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import { clientDocuments } from '@/content/client-documents'
import {
  DRIVE_NEW_FOLDER_SHORTCUT,
  DRIVE_REFRESH_SHORTCUT,
  DRIVE_TOGGLE_VIEW_SHORTCUT,
  DRIVE_UPLOAD_SHORTCUT,
} from '@/src/modules/documents/domain/drive-shortcuts'
import { sortDriveItems } from '@/src/modules/documents/domain/sort-drive-items'
import type { DriveItem } from '@/src/modules/documents/domain/types'
import { DRIVE_ITEM_DRAG_MIME, getDriveDragKind, isExternalFileDrag } from '@/src/modules/documents/ui/drive-drag'
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

  const [internalDropTargetFolderId, setInternalDropTargetFolderId] = useState<string | null>(
    null
  )
  const [uploadOverlayPhase, setUploadOverlayPhase] =
    useState<DriveDropOverlayUploadPhase>('idle')
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [renameItem, setRenameItem] = useState<DriveItem | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteItem, setDeleteItem] = useState<DriveItem | null>(null)
  const [moveItem, setMoveItem] = useState<DriveItem | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderValue, setNewFolderValue] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const {
    items,
    breadcrumbs,
    currentFolderId,
    loading,
    error,
    uploading,
    actionError,
    busyItemId,
    pending,
    loadFolder,
  } = driveFolder

  const overlayActive = usePortalShortcutOverlay()
  const dialogOpen =
    renameItem !== null || newFolderOpen || moveOpen || deleteItem !== null || previewOpen

  const uploadShortcutLabel = formatPortalShortcutLabel(DRIVE_UPLOAD_SHORTCUT)
  const newFolderShortcutLabel = formatPortalShortcutLabel(DRIVE_NEW_FOLDER_SHORTCUT)
  const toggleViewShortcutLabel = formatPortalShortcutLabel(DRIVE_TOGGLE_VIEW_SHORTCUT)
  const refreshShortcutLabel = formatPortalShortcutLabel(DRIVE_REFRESH_SHORTCUT)

  const uploadTooltip = buildPortalShortcutTooltipCopy(
    clientDocuments.shortcuts.upload,
    clientDocuments.upload,
    uploadShortcutLabel
  )
  const newFolderTooltip = buildPortalShortcutTooltipCopy(
    clientDocuments.shortcuts.newFolder,
    clientDocuments.newFolder,
    newFolderShortcutLabel
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

  function clearInternalDragState() {
    setInternalDropTargetFolderId(null)
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

  function handleOpenNewFolderDialog() {
    if (!canWrite || loading || !currentFolderId) return
    setNewFolderValue('')
    setNewFolderOpen(true)
  }

  usePortalShortcut(DRIVE_REFRESH_SHORTCUT, handleRefresh, {
    enabled: !loading && !dialogOpen,
  })
  usePortalShortcut(DRIVE_UPLOAD_SHORTCUT, handleUploadClick, {
    enabled: canWrite && !loading && !uploading && !dialogOpen && Boolean(currentFolderId),
  })
  usePortalShortcut(DRIVE_NEW_FOLDER_SHORTCUT, handleOpenNewFolderDialog, {
    enabled: canWrite && !loading && !dialogOpen && Boolean(currentFolderId),
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
    clearInternalDragState()
    driveFolder.upload(files, folderId, { onPhaseChange: setUploadOverlayPhase })
  }

  function handleRenameConfirm() {
    if (!renameItem) return
    const newName = renameValue.trim()
    if (!newName) return

    driveFolder.rename(renameItem.id, newName, () => {
      setRenameItem(null)
      setRenameValue('')
    })
  }

  function handleDeleteConfirm() {
    if (!deleteItem) return
    driveFolder.remove(deleteItem.id, () => setDeleteItem(null))
  }

  function handleMoveConfirm(targetFolderId: string) {
    if (!moveItem) return
    driveFolder.move(moveItem.id, targetFolderId, () => {
      setMoveOpen(false)
      setMoveItem(null)
    })
  }

  function handleCreateFolder() {
    const name = newFolderValue.trim()
    if (!name) return

    driveFolder.createFolder(name, () => {
      setNewFolderOpen(false)
      setNewFolderValue('')
    })
  }

  function handleFolderDrop(folder: DriveItem, event: React.DragEvent<HTMLElement>) {
    if (!canWrite) return
    const internalPayload = event.dataTransfer.getData(DRIVE_ITEM_DRAG_MIME)
    if (!internalPayload || !currentFolderId) return

    event.preventDefault()
    event.stopPropagation()
    clearInternalDragState()
    resetPageDrag()

    try {
      const parsed = JSON.parse(internalPayload) as { id: string }
      if (!parsed.id || parsed.id === folder.id) return
      driveFolder.move(parsed.id, folder.id, () => {})
    } catch {
      driveFolder.setActionError(clientDocuments.errors.upload_failed)
    }
  }

  function handlePageDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!isExternalFileDrag(event) || !currentFolderId) return
    event.preventDefault()
    resetPageDrag()
    clearInternalDragState()
    if (event.dataTransfer.files.length > 0) {
      handleUpload(event.dataTransfer.files, currentFolderId)
    }
  }

  function handleDownloadItem(item: DriveItem) {
    driveFolder.download(item)
  }

  function handleBreadcrumbNavigate(folderId: string) {
    clearSelection()
    void loadFolder(folderId)
    setSearchQuery('')
  }

  function handleDragStartItem(item: DriveItem, event: React.DragEvent<HTMLElement>) {
    event.dataTransfer.setData(DRIVE_ITEM_DRAG_MIME, JSON.stringify({ id: item.id }))
    event.dataTransfer.effectAllowed = 'move'
  }

  function handleFolderDragOver(item: DriveItem, event: React.DragEvent<HTMLElement>) {
    if (getDriveDragKind(event) !== 'internal') return
    event.preventDefault()
    event.stopPropagation()
    setInternalDropTargetFolderId(item.id)
  }

  function handleFolderDragLeave(item: DriveItem) {
    setInternalDropTargetFolderId((current) => (current === item.id ? null : current))
  }

  function openRenameDialog(item: DriveItem) {
    setRenameItem(item)
    setRenameValue(item.name)
  }

  function openMoveDialog(item: DriveItem) {
    setMoveItem(item)
    setMoveOpen(true)
  }

  function closeRenameDialog() {
    setRenameItem(null)
    setRenameValue('')
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
    busyItemId,
    pending,
    viewMode,
    setViewMode,
    pageDragActive,
    uploadOverlayPhase,
    searchQuery,
    setSearchQuery,
    previewItem,
    previewOpen,
    setPreviewOpen,
    setPreviewItem,
    renameItem,
    renameValue,
    setRenameValue,
    closeRenameDialog,
    deleteItem,
    setDeleteItem,
    moveItem,
    setMoveItem,
    moveOpen,
    setMoveOpen,
    newFolderOpen,
    setNewFolderOpen,
    newFolderValue,
    setNewFolderValue,
    selectedItemId,
    setSelectedItemId,
    internalDropTargetFolderId,
    overlayActive,
    uploadTooltip,
    newFolderTooltip,
    refreshTooltip,
    gridViewTooltip,
    uploadShortcutLabel,
    newFolderShortcutLabel,
    toggleViewShortcutLabel,
    refreshShortcutLabel,
    clearSelection,
    clearInternalDragState,
    handleRefresh,
    handleUploadClick,
    handleOpenNewFolderDialog,
    handleOpenFolder,
    handleOpenFile,
    handleUpload,
    handleRenameConfirm,
    handleDeleteConfirm,
    handleMoveConfirm,
    handleCreateFolder,
    handleFolderDrop,
    handlePageDrop,
    handleDownloadItem,
    handleBreadcrumbNavigate,
    handleDragStartItem,
    handleFolderDragOver,
    handleFolderDragLeave,
    openRenameDialog,
    openMoveDialog,
  }
}
