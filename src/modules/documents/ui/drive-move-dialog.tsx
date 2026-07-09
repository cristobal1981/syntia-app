'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { Folder } from 'lucide-react'

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
import { clientDocuments } from '@/content/client-documents'
import { listDriveFolderAction } from '@/src/modules/documents/application/portal-drive-document-actions'
import type { DriveBreadcrumb, DriveItem } from '@/src/modules/documents/domain/types'
import { DriveBreadcrumbs } from '@/src/modules/documents/ui/drive-breadcrumbs'
import { cn } from '@/lib/utils'

type DriveMoveDialogProps = {
  item: DriveItem | null
  sourceFolderId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (targetFolderId: string) => void
  pending?: boolean
}

export function DriveMoveDialog({
  item,
  sourceFolderId,
  open,
  onOpenChange,
  onConfirm,
  pending = false,
}: DriveMoveDialogProps) {
  const [browseFolderId, setBrowseFolderId] = useState<string | null>(null)
  const [folders, setFolders] = useState<DriveItem[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<DriveBreadcrumb[]>([])
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()

  const loadBrowseFolder = useCallback(async (folderId?: string) => {
    setLoading(true)
    const result = await listDriveFolderAction(folderId ? { folderId } : undefined)
    setLoading(false)

    if (!result.ok) {
      setFolders([])
      setBreadcrumbs([])
      setBrowseFolderId(null)
      return
    }

    setBrowseFolderId(result.listing.currentFolderId)
    setBreadcrumbs(result.listing.breadcrumbs)
    setFolders(result.listing.items.filter((entry) => entry.kind === 'folder'))
  }, [])

  useEffect(() => {
    if (!open) return
    void loadBrowseFolder()
  }, [open, loadBrowseFolder])

  const isMovingFolderIntoDescendant =
    item?.kind === 'folder' &&
    breadcrumbs.some(
      (crumb, index) => crumb.id === item.id && index < breadcrumbs.length - 1
    )

  const canMoveHere =
    Boolean(browseFolderId) &&
    browseFolderId !== sourceFolderId &&
    item?.id !== browseFolderId &&
    !isMovingFolderIntoDescendant

  function handleOpenFolder(folder: DriveItem) {
    if (item?.kind === 'folder' && folder.id === item.id) return
    startTransition(() => {
      void loadBrowseFolder(folder.id)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="z-[60] gap-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{clientDocuments.moveTitle}</DialogTitle>
          <DialogDescription>
            {item
              ? `${clientDocuments.moveDescription} «${item.name}»`
              : clientDocuments.moveDescription}
          </DialogDescription>
        </DialogHeader>

        <DriveBreadcrumbs
          crumbs={breadcrumbs}
          onNavigate={(folderId) => {
            void loadBrowseFolder(folderId)
          }}
        />

        <div className="max-h-56 overflow-y-auto rounded-lg border border-border">
          {loading ? (
            <SyntiaLoadingState
              label={clientDocuments.loadingLabel}
              className="py-8"
              loaderSize={56}
            />
          ) : folders.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              {clientDocuments.emptyTitle}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {folders.map((folder) => {
                const isSelf = item?.id === folder.id
                return (
                  <li key={folder.id}>
                    <button
                      type="button"
                      disabled={isSelf}
                      onClick={() => handleOpenFolder(folder)}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        browseFolderId === folder.id && 'bg-muted/30'
                      )}
                    >
                      <Folder className="size-5 shrink-0 text-primary" aria-hidden />
                      <span className="truncate text-sm font-medium">{folder.name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {clientDocuments.cancel}
          </Button>
          <Button
            type="button"
            className="cursor-pointer"
            disabled={!canMoveHere || pending}
            onClick={() => {
              if (browseFolderId) onConfirm(browseFolderId)
            }}
          >
            {clientDocuments.moveHere}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
