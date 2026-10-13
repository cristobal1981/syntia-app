'use client'

import { FolderOpen, Upload } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { PortalEmptyState } from '@/components/ui/portal-empty-state'
import { SyntiaLoadingState } from '@/components/ui/syntia-loading-state'
import { clientDocuments } from '@/content/client-documents'
import type { DriveItem } from '@/src/modules/documents/domain/types'
import { DriveErrorNotice } from '@/src/modules/documents/ui/drive-error-notice'
import type { DriveFolderError } from '@/src/modules/documents/ui/use-drive-folder'
import { DriveItemCard, type DriveViewMode } from '@/src/modules/documents/ui/drive-item-card'
import { cn } from '@/lib/utils'

type DriveBrowserItemListProps = {
  loading: boolean
  error: DriveFolderError | null
  items: DriveItem[]
  viewMode: DriveViewMode
  canWrite: boolean
  uploading: boolean
  hasCurrentFolder: boolean
  busyItemId: string | null
  pending: boolean
  selectedItemId: string | null
  onRetry: () => void
  onUploadEmptyAction: () => void
  onClearSelection: () => void
  onSelectItem: (id: string) => void
  onOpenFolder: (item: DriveItem) => void
  onOpenFile: (item: DriveItem) => void
  onDownloadItem: (item: DriveItem) => void
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
  onRetry,
  onUploadEmptyAction,
  onClearSelection,
  onSelectItem,
  onOpenFolder,
  onOpenFile,
  onDownloadItem,
}: DriveBrowserItemListProps) {
  if (loading) {
    return <SyntiaLoadingState centered label={clientDocuments.loadingLabel} />
  }

  if (error) {
    return (
      <DriveErrorNotice
        variant="panel"
        code={error.code}
        context={error.context}
        onRetry={onRetry}
      />
    )
  }

  if (items.length === 0) {
    return (
      <PortalEmptyState
        icon={FolderOpen}
        title={clientDocuments.emptyTitle}
        description={clientDocuments.emptyDescription}
        action={
          canWrite ? (
            <Button
              type="button"
              className="cursor-pointer"
              disabled={!hasCurrentFolder || uploading}
              onClick={onUploadEmptyAction}
            >
              <Upload className="size-4" aria-hidden />
              {clientDocuments.emptyAction}
            </Button>
          ) : null
        }
      />
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
          downloading={busyItemId === item.id}
          isSelected={selectedItemId === item.id}
          onSelect={() => onSelectItem(item.id)}
          onOpen={() => (item.kind === 'folder' ? onOpenFolder(item) : onOpenFile(item))}
          onDownload={item.kind !== 'folder' ? () => onDownloadItem(item) : undefined}
        />
      ))}
    </div>
  )
}
