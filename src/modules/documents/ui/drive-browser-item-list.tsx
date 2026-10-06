'use client'

import { Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { SyntiaLoadingState } from '@/components/ui/syntia-loading-state'
import { clientDocuments } from '@/content/client-documents'
import type { DriveItem } from '@/src/modules/documents/domain/types'
import { DriveItemCard, type DriveViewMode } from '@/src/modules/documents/ui/drive-item-card'
import { cn } from '@/lib/utils'

type DriveBrowserItemListProps = {
  loading: boolean
  error: string | null
  items: DriveItem[]
  viewMode: DriveViewMode
  canWrite: boolean
  uploading: boolean
  hasCurrentFolder: boolean
  busyItemId: string | null
  pending: boolean
  selectedItemId: string | null
  internalDropTargetFolderId: string | null
  onRetry: () => void
  onUploadEmptyAction: () => void
  onClearSelection: () => void
  onSelectItem: (id: string) => void
  onOpenFolder: (item: DriveItem) => void
  onOpenFile: (item: DriveItem) => void
  onDownloadItem: (item: DriveItem) => void
  onRenameItem: (item: DriveItem) => void
  onMoveItem: (item: DriveItem) => void
  onDeleteItem: (item: DriveItem) => void
  onDragStartItem: (item: DriveItem, event: React.DragEvent<HTMLElement>) => void
  onDragEndItem: () => void
  onFolderDragOver: (item: DriveItem, event: React.DragEvent<HTMLElement>) => void
  onFolderDragLeave: (item: DriveItem) => void
  onFolderDrop: (item: DriveItem, event: React.DragEvent<HTMLElement>) => void
}

export function DriveBrowserItemList({
  loading,
  error,
  items,
  viewMode,
  canWrite,
  uploading,
  hasCurrentFolder,
  busyItemId,
  pending,
  selectedItemId,
  internalDropTargetFolderId,
  onRetry,
  onUploadEmptyAction,
  onClearSelection,
  onSelectItem,
  onOpenFolder,
  onOpenFile,
  onDownloadItem,
  onRenameItem,
  onMoveItem,
  onDeleteItem,
  onDragStartItem,
  onDragEndItem,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
}: DriveBrowserItemListProps) {
  if (loading) {
    return <SyntiaLoadingState label={clientDocuments.loadingLabel} className="py-16" />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-12 text-center">
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
        <Button type="button" variant="outline" className="cursor-pointer" onClick={onRetry}>
          {clientDocuments.retry}
        </Button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-6 py-12 text-center">
        <p className="font-medium text-foreground">{clientDocuments.emptyTitle}</p>
        <p className="max-w-md text-sm text-muted-foreground">
          {clientDocuments.emptyDescription}
        </p>
        {canWrite ? (
          <Button
            type="button"
            className="cursor-pointer"
            disabled={!hasCurrentFolder || uploading}
            onClick={onUploadEmptyAction}
          >
            <Upload className="size-4" aria-hidden />
            {clientDocuments.emptyAction}
          </Button>
        ) : null}
      </div>
    )
  }

  return (
    <div
      className={cn(
        viewMode === 'grid'
          ? 'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          : 'flex flex-col gap-2'
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClearSelection()
      }}
    >
      {items.map((item) => (
        <DriveItemCard
          key={item.id}
          item={item}
          viewMode={viewMode}
          busy={busyItemId === item.id || pending}
          isSelected={selectedItemId === item.id}
          isInternalDropTarget={
            item.kind === 'folder' && internalDropTargetFolderId === item.id
          }
          onSelect={() => onSelectItem(item.id)}
          onOpen={() => (item.kind === 'folder' ? onOpenFolder(item) : onOpenFile(item))}
          onDownload={item.kind !== 'folder' ? () => onDownloadItem(item) : undefined}
          onRename={canWrite ? () => onRenameItem(item) : undefined}
          onMove={canWrite ? () => onMoveItem(item) : undefined}
          onDelete={canWrite ? () => onDeleteItem(item) : undefined}
          onDragStartItem={canWrite ? (event) => onDragStartItem(item, event) : undefined}
          onDragEndItem={onDragEndItem}
          onFolderDragOver={
            canWrite && item.kind === 'folder'
              ? (event) => onFolderDragOver(item, event)
              : undefined
          }
          onFolderDragLeave={
            canWrite && item.kind === 'folder' ? () => onFolderDragLeave(item) : undefined
          }
          onFolderDrop={
            canWrite && item.kind === 'folder' ? (event) => onFolderDrop(item, event) : undefined
          }
        />
      ))}
    </div>
  )
}
