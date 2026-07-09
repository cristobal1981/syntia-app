'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import {
  FolderPlus,
  Grid3x3,
  LayoutList,
  Loader2,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SyntiaLoadingState } from '@/components/ui/syntia-loading-state'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
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
import {
  DRIVE_NEW_FOLDER_SHORTCUT,
  DRIVE_REFRESH_SHORTCUT,
  DRIVE_TOGGLE_VIEW_SHORTCUT,
  DRIVE_UPLOAD_SHORTCUT,
} from '@/src/modules/documents/domain/drive-shortcuts'
import { sortDriveItems } from '@/src/modules/documents/domain/sort-drive-items'
import type { DriveBreadcrumb, DriveItem } from '@/src/modules/documents/domain/types'
import { DriveBreadcrumbs } from '@/src/modules/documents/ui/drive-breadcrumbs'
import { DriveDocumentPreviewDialog } from '@/src/modules/documents/ui/drive-document-preview-dialog'
import { DriveDropOverlay, type DriveDropOverlayUploadPhase } from '@/src/modules/documents/ui/drive-drop-overlay'
import {
  DRIVE_ITEM_DRAG_MIME,
  getDriveDragKind,
  isExternalFileDrag,
} from '@/src/modules/documents/ui/drive-drag'
import { DriveItemCard, type DriveViewMode } from '@/src/modules/documents/ui/drive-item-card'
import { DriveMoveDialog } from '@/src/modules/documents/ui/drive-move-dialog'
import { buildPortalShortcutTooltipCopy } from '@/src/modules/portal/domain/portal-shortcut-platform'
import {
  formatPortalShortcutLabel,
  isPortalShortcutBlockedTarget,
} from '@/src/modules/portal/domain/portal-shortcuts'
import { PortalActionButton } from '@/src/modules/portal/ui/portal-action-button'
import { PortalFilterIconChip } from '@/src/modules/portal/ui/portal-filter-chip'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'
import { usePortalShortcutOverlay } from '@/src/modules/portal/ui/portal-shortcut-overlay-context'
import { usePortalShortcut } from '@/src/modules/portal/ui/use-portal-shortcut'
import { triggerBase64Download } from '@/src/modules/portal/lib/trigger-base64-download'
import {
  dedupedServerAction,
  serverActionDedupKey,
} from '@/src/modules/portal/infrastructure/server-action-dedup'
import { cn } from '@/lib/utils'

const VIEW_MODE_STORAGE_KEY = 'syntia-drive-view-mode'

function readInitialViewMode(): DriveViewMode {
  if (typeof window === 'undefined') return 'grid'
  const stored = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY)
  if (stored === 'list' || stored === 'grid') return stored
  return window.matchMedia('(max-width: 639px)').matches ? 'list' : 'grid'
}

function errorMessage(code: keyof typeof clientDocuments.errors): string {
  return clientDocuments.errors[code] ?? clientDocuments.errors.drive_unavailable
}

export function DriveBrowser() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<DriveItem[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<DriveBreadcrumb[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<DriveViewMode>('grid')
  const [pageDragDepth, setPageDragDepth] = useState(0)
  const [internalDropTargetFolderId, setInternalDropTargetFolderId] = useState<string | null>(
    null
  )
  const [uploading, setUploading] = useState(false)
  const [uploadOverlayPhase, setUploadOverlayPhase] =
    useState<DriveDropOverlayUploadPhase>('idle')
  const [actionError, setActionError] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<DriveItem | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [renameItem, setRenameItem] = useState<DriveItem | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteItem, setDeleteItem] = useState<DriveItem | null>(null)
  const [moveItem, setMoveItem] = useState<DriveItem | null>(null)
  const [moveOpen, setMoveOpen] = useState(false)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderValue, setNewFolderValue] = useState('')
  const [busyItemId, setBusyItemId] = useState<string | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const overlayActive = usePortalShortcutOverlay()
  const pageDragActive = pageDragDepth > 0
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
    setViewMode(readInitialViewMode())
  }, [])

  const loadFolder = useCallback(async (folderId?: string) => {
    setLoading(true)
    setError(null)
    setActionError(null)
    setSelectedItemId(null)

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
    void loadFolder()
  }, [loadFolder])

  useEffect(() => {
    const onDragEnter = (event: DragEvent) => {
      if (!isExternalFileDrag(event)) return
      event.preventDefault()
      setPageDragDepth((depth) => depth + 1)
    }

    const onDragLeave = (event: DragEvent) => {
      if (!isExternalFileDrag(event)) return
      setPageDragDepth((depth) => Math.max(0, depth - 1))
    }

    const onDragOver = (event: DragEvent) => {
      if (!isExternalFileDrag(event)) return
      event.preventDefault()
    }

    const onDrop = (event: DragEvent) => {
      if (!isExternalFileDrag(event)) return
      event.preventDefault()
      setPageDragDepth(0)
      clearInternalDragState()
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)

    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

  const filteredItems = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase('es')
    const matched = query
      ? items.filter((item) => item.name.toLocaleLowerCase('es').includes(query))
      : items
    return sortDriveItems(matched)
  }, [items, searchQuery])

  function handleViewModeChange(mode: DriveViewMode) {
    setViewMode(mode)
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
  }

  function handleToggleView() {
    handleViewModeChange(viewMode === 'grid' ? 'list' : 'grid')
  }

  function handleRefresh() {
    if (loading) return
    void loadFolder(currentFolderId ?? undefined)
  }

  function handleUploadClick() {
    if (loading || uploading || !currentFolderId) return
    fileInputRef.current?.click()
  }

  function handleOpenNewFolderDialog() {
    if (loading || !currentFolderId) return
    setNewFolderValue('')
    setNewFolderOpen(true)
  }

  usePortalShortcut(DRIVE_REFRESH_SHORTCUT, handleRefresh, {
    enabled: !loading && !dialogOpen,
  })
  usePortalShortcut(DRIVE_UPLOAD_SHORTCUT, handleUploadClick, {
    enabled: !loading && !uploading && !dialogOpen && Boolean(currentFolderId),
  })
  usePortalShortcut(DRIVE_NEW_FOLDER_SHORTCUT, handleOpenNewFolderDialog, {
    enabled: !loading && !dialogOpen && Boolean(currentFolderId),
  })
  usePortalShortcut(DRIVE_TOGGLE_VIEW_SHORTCUT, handleToggleView, {
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

  function handleDownload(item: DriveItem) {
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
  }

  function handleUpload(files: FileList | File[], targetFolderId?: string) {
    const folderId = targetFolderId ?? currentFolderId
    if (!folderId) return

    const fileArray = Array.from(files)
    if (!fileArray.length) return

    setUploading(true)
    setUploadOverlayPhase('uploading')
    setActionError(null)
    setPageDragDepth(0)
    clearInternalDragState()

    const formData = new FormData()
    formData.set('parentFolderId', folderId)
    for (const file of fileArray) {
      formData.append('files', file)
    }

    startTransition(async () => {
      const result = await uploadDriveFilesAction(formData)
      setUploading(false)

      if (!result.ok) {
        setUploadOverlayPhase('idle')
        setActionError(errorMessage(result.error))
        return
      }

      setUploadOverlayPhase('success')
      await loadFolder(currentFolderId ?? folderId)
      window.setTimeout(() => setUploadOverlayPhase('idle'), 1500)
    })
  }

  function handleRenameConfirm() {
    if (!renameItem) return
    const newName = renameValue.trim()
    if (!newName) return

    setActionError(null)
    setBusyItemId(renameItem.id)

    startTransition(async () => {
      const result = await renameDriveItemAction({
        itemId: renameItem.id,
        newName,
      })
      setBusyItemId(null)

      if (!result.ok) {
        setActionError(errorMessage(result.error))
        return
      }

      setRenameItem(null)
      setRenameValue('')
      if (currentFolderId) {
        await loadFolder(currentFolderId)
      }
    })
  }

  function handleDeleteConfirm() {
    if (!deleteItem || !currentFolderId) return

    setActionError(null)
    setBusyItemId(deleteItem.id)

    startTransition(async () => {
      const result = await deleteDriveItemAction({ itemId: deleteItem.id })
      setBusyItemId(null)

      if (!result.ok) {
        setActionError(errorMessage(result.error))
        return
      }

      setDeleteItem(null)
      await loadFolder(currentFolderId)
    })
  }

  function handleMoveConfirm(targetFolderId: string) {
    if (!moveItem || !currentFolderId) return

    setActionError(null)
    setBusyItemId(moveItem.id)

    startTransition(async () => {
      const result = await moveDriveItemAction({
        itemId: moveItem.id,
        targetFolderId,
        sourceFolderId: currentFolderId,
      })
      setBusyItemId(null)

      if (!result.ok) {
        setActionError(errorMessage(result.error))
        return
      }

      setMoveOpen(false)
      setMoveItem(null)
      await loadFolder(currentFolderId)
    })
  }

  function handleCreateFolder() {
    if (!currentFolderId) return
    const name = newFolderValue.trim()
    if (!name) return

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

      setNewFolderOpen(false)
      setNewFolderValue('')
      await loadFolder(currentFolderId)
    })
  }

  function handleFolderDrop(folder: DriveItem, event: React.DragEvent<HTMLElement>) {
    const internalPayload = event.dataTransfer.getData(DRIVE_ITEM_DRAG_MIME)
    if (!internalPayload || !currentFolderId) return

    event.preventDefault()
    event.stopPropagation()
    clearInternalDragState()
    setPageDragDepth(0)

    try {
      const parsed = JSON.parse(internalPayload) as { id: string }
      if (!parsed.id || parsed.id === folder.id) return

      setBusyItemId(parsed.id)
      startTransition(async () => {
        const result = await moveDriveItemAction({
          itemId: parsed.id,
          targetFolderId: folder.id,
          sourceFolderId: currentFolderId,
        })
        setBusyItemId(null)

        if (!result.ok) {
          setActionError(errorMessage(result.error))
          return
        }

        await loadFolder(currentFolderId)
      })
    } catch {
      setActionError(clientDocuments.errors.upload_failed)
    }
  }

  function handlePageDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!isExternalFileDrag(event) || !currentFolderId) return
    event.preventDefault()
    setPageDragDepth(0)
    clearInternalDragState()
    if (event.dataTransfer.files.length > 0) {
      handleUpload(event.dataTransfer.files, currentFolderId)
    }
  }

  return (
    <div
      className="relative flex flex-col gap-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) clearSelection()
      }}
      onDragOver={(event) => {
        if (isExternalFileDrag(event)) event.preventDefault()
      }}
      onDrop={handlePageDrop}
    >
      <DriveDropOverlay
        active={pageDragActive || uploadOverlayPhase !== 'idle'}
        uploadPhase={uploadOverlayPhase}
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="sr-only"
        disabled={uploading || pending || loading || !currentFolderId}
        onChange={(event) => {
          if (event.target.files?.length) {
            handleUpload(event.target.files)
          }
          event.target.value = ''
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <DriveBreadcrumbs
            size="large"
            crumbs={breadcrumbs}
            onNavigate={(folderId) => {
              clearSelection()
              void loadFolder(folderId)
              setSearchQuery('')
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <PortalActionButton
            label={clientDocuments.upload}
            pendingLabel={clientDocuments.uploading}
            pending={uploading}
            disabled={loading || !currentFolderId}
            onClick={handleUploadClick}
            variant="outline"
            size="sm"
            icon={uploading ? Loader2 : Upload}
            iconBehavior={uploading ? 'spinWhenPending' : 'static'}
            shortcut={DRIVE_UPLOAD_SHORTCUT}
            tooltip={overlayActive ? uploadTooltip.active : uploadTooltip.idle}
            ariaKeyshortcuts={uploadShortcutLabel}
            overlayRingClassName="ring-2 ring-primary/35"
          />
          <PortalActionButton
            label={clientDocuments.newFolder}
            disabled={loading || !currentFolderId}
            onClick={handleOpenNewFolderDialog}
            variant="outline"
            size="sm"
            icon={FolderPlus}
            shortcut={DRIVE_NEW_FOLDER_SHORTCUT}
            tooltip={overlayActive ? newFolderTooltip.active : newFolderTooltip.idle}
            ariaKeyshortcuts={newFolderShortcutLabel}
            overlayRingClassName="ring-2 ring-primary/35"
          />
          <PortalActionButton
            label={clientDocuments.refresh}
            pendingLabel={clientDocuments.refreshing}
            pending={loading}
            disabled={loading}
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            icon={RefreshCw}
            iconBehavior="spinWhenPending"
            shortcut={DRIVE_REFRESH_SHORTCUT}
            tooltip={overlayActive ? refreshTooltip.active : refreshTooltip.idle}
            ariaKeyshortcuts={refreshShortcutLabel}
            overlayRingClassName="ring-2 ring-primary/35"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={clientDocuments.searchPlaceholder}
            className="pl-9"
            aria-label={clientDocuments.searchPlaceholder}
          />
        </div>
        <div
          className="flex items-center gap-2 self-end sm:self-auto"
          role="group"
          aria-label={clientDocuments.viewModeLabel}
        >
          <PortalFilterIconChip
            label={clientDocuments.viewGrid}
            active={viewMode === 'grid'}
            onClick={() => handleViewModeChange('grid')}
            aria-keyshortcuts={toggleViewShortcutLabel}
            tooltip={overlayActive ? gridViewTooltip.active : gridViewTooltip.idle}
          >
            <Grid3x3 className="size-4" aria-hidden />
          </PortalFilterIconChip>
          <PortalFilterIconChip
            label={clientDocuments.viewList}
            active={viewMode === 'list'}
            onClick={() => handleViewModeChange('list')}
            tooltip={clientDocuments.viewList}
          >
            <LayoutList className="size-4" aria-hidden />
          </PortalFilterIconChip>
        </div>
      </div>

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {loading ? (
        <SyntiaLoadingState
          label={clientDocuments.loadingLabel}
          className="py-16"
        />
      ) : error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center">
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            onClick={() => void loadFolder(currentFolderId ?? undefined)}
          >
            {clientDocuments.retry}
          </Button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
          <p className="font-medium text-foreground">{clientDocuments.emptyTitle}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {clientDocuments.emptyDescription}
          </p>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={!currentFolderId || uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" aria-hidden />
            {clientDocuments.emptyAction}
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              : 'flex flex-col gap-2'
          )}
          onClick={(event) => {
            if (event.target === event.currentTarget) clearSelection()
          }}
        >
          {filteredItems.map((item) => (
            <DriveItemCard
              key={item.id}
              item={item}
              viewMode={viewMode}
              busy={busyItemId === item.id || pending}
              isSelected={selectedItemId === item.id}
              isInternalDropTarget={
                item.kind === 'folder' && internalDropTargetFolderId === item.id
              }
              onSelect={() => setSelectedItemId(item.id)}
              onOpen={() =>
                item.kind === 'folder' ? handleOpenFolder(item) : handleOpenFile(item)
              }
              onDownload={item.kind !== 'folder' ? () => handleDownload(item) : undefined}
              onRename={() => {
                setRenameItem(item)
                setRenameValue(item.name)
              }}
              onMove={() => {
                setMoveItem(item)
                setMoveOpen(true)
              }}
              onDelete={() => setDeleteItem(item)}
              onDragStartItem={(event) => {
                event.dataTransfer.setData(
                  DRIVE_ITEM_DRAG_MIME,
                  JSON.stringify({ id: item.id })
                )
                event.dataTransfer.effectAllowed = 'move'
              }}
              onDragEndItem={clearInternalDragState}
              onFolderDragOver={
                item.kind === 'folder'
                  ? (event) => {
                      if (getDriveDragKind(event) !== 'internal') return
                      event.preventDefault()
                      event.stopPropagation()
                      setInternalDropTargetFolderId(item.id)
                    }
                  : undefined
              }
              onFolderDragLeave={
                item.kind === 'folder'
                  ? () => {
                      setInternalDropTargetFolderId((current) =>
                        current === item.id ? null : current
                      )
                    }
                  : undefined
              }
              onFolderDrop={
                item.kind === 'folder'
                  ? (event) => handleFolderDrop(item, event)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <DriveDocumentPreviewDialog
        item={previewItem}
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open) setPreviewItem(null)
        }}
      />

      <DriveMoveDialog
        item={moveItem}
        sourceFolderId={currentFolderId}
        open={moveOpen}
        onOpenChange={(open) => {
          setMoveOpen(open)
          if (!open) setMoveItem(null)
        }}
        onConfirm={handleMoveConfirm}
        pending={pending}
      />

      <Dialog
        open={renameItem !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRenameItem(null)
            setRenameValue('')
          }
        }}
      >
        <DialogContent showCloseButton={false} className="z-[60]">
          <DialogHeader>
            <DialogTitle>{clientDocuments.renameTitle}</DialogTitle>
            <DialogDescription>{clientDocuments.renameLabel}</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            placeholder={clientDocuments.renameLabel}
            aria-label={clientDocuments.renameLabel}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRenameItem(null)
                setRenameValue('')
              }}
            >
              {clientDocuments.cancel}
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={!renameValue.trim() || pending}
              onClick={handleRenameConfirm}
            >
              {clientDocuments.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent showCloseButton={false} className="z-[60]">
          <DialogHeader>
            <DialogTitle>{clientDocuments.newFolderTitle}</DialogTitle>
            <DialogDescription>{clientDocuments.newFolderLabel}</DialogDescription>
          </DialogHeader>
          <Input
            value={newFolderValue}
            onChange={(event) => setNewFolderValue(event.target.value)}
            placeholder={clientDocuments.newFolderPlaceholder}
            aria-label={clientDocuments.newFolderLabel}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setNewFolderOpen(false)}>
              {clientDocuments.cancel}
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={!newFolderValue.trim() || pending}
              onClick={handleCreateFolder}
            >
              {clientDocuments.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PortalConfirmDialog
        open={deleteItem !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null)
        }}
        title={clientDocuments.deleteTitle}
        description={
          deleteItem
            ? clientDocuments.deleteDescription.replace('{name}', deleteItem.name)
            : ''
        }
        confirmLabel={clientDocuments.confirmDelete}
        confirmVariant="destructive"
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
