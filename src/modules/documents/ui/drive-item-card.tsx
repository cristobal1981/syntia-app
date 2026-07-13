'use client'

import {
  Download,
  EllipsisVertical,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderInput,
  ImageIcon,
  Pencil,
  Presentation,
  Trash2,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { clientDocuments } from '@/content/client-documents'
import type { DriveItem } from '@/src/modules/documents/domain/types'
import { cn } from '@/lib/utils'

export type DriveViewMode = 'grid' | 'list'

const actionBarVisibility =
  'opacity-100 sm:opacity-0 sm:transition-opacity sm:duration-200 motion-reduce:transition-none sm:group-hover:opacity-100 sm:group-focus-within:opacity-100'

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatModifiedDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function DriveItemIcon({ item, className }: { item: DriveItem; className?: string }) {
  const filledClassName = cn('fill-current/25 stroke-[1.8]', className)

  switch (item.kind) {
    case 'folder':
      return <Folder className={cn('text-primary', filledClassName)} aria-hidden />
    case 'image':
      return <ImageIcon className={cn('text-sky-500', filledClassName)} aria-hidden />
    case 'pdf':
      return <FileText className={cn('text-rose-500', filledClassName)} aria-hidden />
    case 'docx':
    case 'google-doc':
      return <FileText className={cn('text-blue-600', filledClassName)} aria-hidden />
    case 'xlsx':
    case 'google-sheet':
      return <FileSpreadsheet className={cn('text-emerald-600', filledClassName)} aria-hidden />
    case 'google-slide':
      return <Presentation className={cn('text-amber-600', filledClassName)} aria-hidden />
    default:
      return <FileText className={cn('text-violet-500', filledClassName)} aria-hidden />
  }
}

type DriveItemCardProps = {
  item: DriveItem
  viewMode: DriveViewMode
  busy?: boolean
  isSelected?: boolean
  isInternalDropTarget?: boolean
  onSelect?: () => void
  onOpen: () => void
  onDownload?: () => void
  onRename?: () => void
  onDelete?: () => void
  onMove?: () => void
  onDragStartItem?: (event: React.DragEvent<HTMLElement>) => void
  onDragEndItem?: () => void
  onFolderDragOver?: (event: React.DragEvent<HTMLElement>) => void
  onFolderDragLeave?: () => void
  onFolderDrop?: (event: React.DragEvent<HTMLElement>) => void
}

export function DriveItemCard({
  item,
  viewMode,
  busy = false,
  isSelected = false,
  isInternalDropTarget = false,
  onSelect,
  onOpen,
  onDownload,
  onRename,
  onDelete,
  onMove,
  onDragStartItem,
  onDragEndItem,
  onFolderDragOver,
  onFolderDragLeave,
  onFolderDrop,
}: DriveItemCardProps) {
  const isFolder = item.kind === 'folder'
  const sizeLabel = formatFileSize(item.size)
  const modifiedLabel = formatModifiedDate(item.modifiedAt)
  const hasMenu = onRename || onDelete || onMove

  const openButtonLabel = isFolder
    ? `${item.name}. ${clientDocuments.openFolderHint}`
    : `${item.name}. ${clientDocuments.openFileHint}`

  const dropTargetClasses = 'border-primary bg-primary/5 ring-2 ring-primary/40'
  const selectedClasses = 'border-emerald-500 ring-2 ring-emerald-500/35'

  const resolveSurfaceClasses = (defaultClasses: string) => {
    if (isInternalDropTarget) return dropTargetClasses
    if (isSelected) return selectedClasses
    return defaultClasses
  }

  const cardClasses = cn(
    'group relative flex h-full min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-xs transition-colors',
    resolveSurfaceClasses('border-border hover:border-primary/30 dark:border-border/80')
  )

  const listClasses = cn(
    'group flex min-w-0 items-center gap-3 rounded-lg border bg-card px-3 py-2.5 shadow-xs transition-colors',
    resolveSurfaceClasses('border-border dark:border-border/80')
  )

  const actionBar = (
    <div
      className="flex items-center gap-0.5"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      {!isFolder && onDownload ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 cursor-pointer"
          disabled={busy}
          onClick={onDownload}
          aria-label={`${clientDocuments.download}: ${item.name}`}
        >
          <Download className="size-4" aria-hidden />
        </Button>
      ) : null}
      {hasMenu ? (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-9 cursor-pointer"
              disabled={busy}
              aria-label={`${clientDocuments.moreActions}: ${item.name}`}
            >
              <EllipsisVertical className="size-4" aria-hidden />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="z-[80] w-44 p-1">
            <div className="flex flex-col gap-0.5">
              {onRename ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-full cursor-pointer justify-start px-2"
                  onClick={onRename}
                >
                  <Pencil className="size-4" aria-hidden />
                  {clientDocuments.rename}
                </Button>
              ) : null}
              {onMove ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-full cursor-pointer justify-start px-2"
                  onClick={onMove}
                >
                  <FolderInput className="size-4" aria-hidden />
                  {clientDocuments.move}
                </Button>
              ) : null}
              {onDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-9 w-full cursor-pointer justify-start px-2 text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="size-4" aria-hidden />
                  {clientDocuments.delete}
                </Button>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>
      ) : null}
    </div>
  )

  const dragProps = {
    ...(onDragStartItem
      ? {
          draggable: true as const,
          onDragStart: onDragStartItem,
          onDragEnd: onDragEndItem,
        }
      : {}),
    ...(isFolder
      ? {
          onDragOver: onFolderDragOver,
          onDragLeave: onFolderDragLeave,
          onDrop: onFolderDrop,
        }
      : {}),
  }

  if (viewMode === 'list') {
    return (
      <article className={listClasses} aria-selected={isSelected} {...dragProps}>
        <button
          type="button"
          onClick={onSelect}
          onDoubleClick={onOpen}
          aria-label={openButtonLabel}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <DriveItemIcon item={item} className="size-5 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
            <p className="text-xs text-muted-foreground">
              {[isFolder ? clientDocuments.folderLabel : sizeLabel, modifiedLabel]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </button>
        {isInternalDropTarget && isFolder ? (
          <span className="shrink-0 text-xs font-medium text-primary">
            {clientDocuments.dropInternalHint}
          </span>
        ) : null}
        <div className={cn('shrink-0', actionBarVisibility)}>{actionBar}</div>
      </article>
    )
  }

  return (
    <article className={cardClasses} aria-selected={isSelected} {...dragProps}>
      <button
        type="button"
        onClick={onSelect}
        onDoubleClick={onOpen}
        aria-label={openButtonLabel}
        className="flex h-full min-h-36 cursor-pointer flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-muted/40 p-4">
          {item.thumbnailLink && item.kind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailLink}
              alt=""
              className="max-h-24 max-w-full rounded-md object-contain"
            />
          ) : (
            <DriveItemIcon item={item} className="size-10" />
          )}
        </div>
        <div className="mt-auto border-t border-border px-3 py-2 text-left dark:border-border/80">
          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {isInternalDropTarget && isFolder
              ? clientDocuments.dropInternalHint
              : [isFolder ? clientDocuments.folderLabel : sizeLabel, modifiedLabel]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
        </div>
      </button>

      <div
        className={cn(
          'absolute top-2 right-2 z-10 rounded-lg border border-border/80 bg-card/95 p-0.5 shadow-sm backdrop-blur-sm',
          actionBarVisibility
        )}
      >
        {actionBar}
      </div>
    </article>
  )
}
