'use client'

import { DriveBrowserItemList } from '@/src/modules/documents/ui/drive-browser-item-list'
import { DriveBrowserSearchBar } from '@/src/modules/documents/ui/drive-browser-search-bar'
import { DriveBrowserToolbar } from '@/src/modules/documents/ui/drive-browser-toolbar'
import { DriveErrorNotice } from '@/src/modules/documents/ui/drive-error-notice'
import { DriveDocumentPreviewDialog } from '@/src/modules/documents/ui/drive-document-preview-dialog'
import { DriveDropOverlay } from '@/src/modules/documents/ui/drive-drop-overlay'
import { isExternalFileDrag } from '@/src/modules/documents/ui/drive-drag'
import { useDriveBrowser } from '@/src/modules/documents/ui/use-drive-browser'

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
        duplicate={duplicate}
        onDismiss={dismissDuplicate}
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
        onRefresh={handleRefresh}
        overlayActive={overlayActive}
        uploadTooltip={uploadTooltip}
        refreshTooltip={refreshTooltip}
        uploadShortcutLabel={uploadShortcutLabel}
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
        <DriveErrorNotice
          code={actionError.code}
          context={actionError.context}
          onRetry={handleRefresh}
          onHome={handleGoHome}
          onDismiss={clearActionError}
        />
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
        onRetry={handleRefresh}
        onUploadEmptyAction={handleUploadClick}
        onClearSelection={clearSelection}
        onSelectItem={setSelectedItemId}
        onOpenFolder={handleOpenFolder}
        onOpenFile={handleOpenFile}
        onDownloadItem={handleDownloadItem}
      />

      <DriveDocumentPreviewDialog
        item={previewItem}
        onUnavailable={handleFileUnavailable}
        open={previewOpen}
        onOpenChange={(open) => {
          setPreviewOpen(open)
          if (!open) setPreviewItem(null)
        }}
      />

    </div>
  )
}
