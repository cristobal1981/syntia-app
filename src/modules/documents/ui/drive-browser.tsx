'use client'

import { clientDocuments } from '@/content/client-documents'
import { DriveBrowserItemList } from '@/src/modules/documents/ui/drive-browser-item-list'
import { DriveBrowserSearchBar } from '@/src/modules/documents/ui/drive-browser-search-bar'
import { DriveBrowserToolbar } from '@/src/modules/documents/ui/drive-browser-toolbar'
import { DriveDocumentPreviewDialog } from '@/src/modules/documents/ui/drive-document-preview-dialog'
import { DriveDropOverlay } from '@/src/modules/documents/ui/drive-drop-overlay'
import { isExternalFileDrag } from '@/src/modules/documents/ui/drive-drag'
import { DriveMoveDialog } from '@/src/modules/documents/ui/drive-move-dialog'
import { DriveNewFolderDialog } from '@/src/modules/documents/ui/drive-new-folder-dialog'
import { DriveRenameDialog } from '@/src/modules/documents/ui/drive-rename-dialog'
import { useDriveBrowser } from '@/src/modules/documents/ui/use-drive-browser'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'

type DriveBrowserProps = {
  canWrite: boolean
}

export function DriveBrowser({ canWrite }: DriveBrowserProps) {
  const {
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
    clearInternalDragState,
    handleFolderDragOver,
    handleFolderDragLeave,
    openRenameDialog,
    openMoveDialog,
  } = useDriveBrowser(canWrite)

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
        disabled={!canWrite || uploading || pending || loading || !currentFolderId}
        onChange={(event) => {
          if (event.target.files?.length) {
            handleUpload(event.target.files)
          }
          event.target.value = ''
        }}
      />

      <DriveBrowserToolbar
        canWrite={canWrite}
        breadcrumbs={breadcrumbs}
        onNavigateBreadcrumb={handleBreadcrumbNavigate}
        loading={loading}
        uploading={uploading}
        hasCurrentFolder={Boolean(currentFolderId)}
        onUploadClick={handleUploadClick}
        onNewFolderClick={handleOpenNewFolderDialog}
        onRefresh={handleRefresh}
        overlayActive={overlayActive}
        uploadTooltip={uploadTooltip}
        newFolderTooltip={newFolderTooltip}
        refreshTooltip={refreshTooltip}
        uploadShortcutLabel={uploadShortcutLabel}
        newFolderShortcutLabel={newFolderShortcutLabel}
        refreshShortcutLabel={refreshShortcutLabel}
      />

      <DriveBrowserSearchBar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        overlayActive={overlayActive}
        gridViewTooltip={gridViewTooltip}
        toggleViewShortcutLabel={toggleViewShortcutLabel}
      />

      {actionError ? (
        <p className="text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      <DriveBrowserItemList
        loading={loading}
        error={error}
        items={filteredItems}
        viewMode={viewMode}
        canWrite={canWrite}
        uploading={uploading}
        hasCurrentFolder={Boolean(currentFolderId)}
        busyItemId={busyItemId}
        pending={pending}
        selectedItemId={selectedItemId}
        internalDropTargetFolderId={internalDropTargetFolderId}
        onRetry={handleRefresh}
        onUploadEmptyAction={handleUploadClick}
        onClearSelection={clearSelection}
        onSelectItem={setSelectedItemId}
        onOpenFolder={handleOpenFolder}
        onOpenFile={handleOpenFile}
        onDownloadItem={handleDownloadItem}
        onRenameItem={openRenameDialog}
        onMoveItem={openMoveDialog}
        onDeleteItem={setDeleteItem}
        onDragStartItem={handleDragStartItem}
        onDragEndItem={clearInternalDragState}
        onFolderDragOver={handleFolderDragOver}
        onFolderDragLeave={handleFolderDragLeave}
        onFolderDrop={handleFolderDrop}
      />

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

      <DriveRenameDialog
        open={renameItem !== null}
        value={renameValue}
        pending={pending}
        onValueChange={setRenameValue}
        onCancel={closeRenameDialog}
        onConfirm={handleRenameConfirm}
      />

      <DriveNewFolderDialog
        open={newFolderOpen}
        value={newFolderValue}
        pending={pending}
        onOpenChange={setNewFolderOpen}
        onValueChange={setNewFolderValue}
        onConfirm={handleCreateFolder}
      />

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
