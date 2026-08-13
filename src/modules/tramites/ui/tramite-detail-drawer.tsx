'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  MessageSquare,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { portalChatter } from '@/content/portal-chatter'
import { portalDocuments } from '@/content/portal-documents'
import { tramites } from '@/content/tramites'
import { triggerBase64Download } from '@/src/modules/portal/lib/trigger-base64-download'
import { downloadAllAttachmentsZipAction } from '@/src/modules/portal/application/portal-document-actions'
import { RecordAttachmentsPanel } from '@/src/modules/portal/ui/record-attachments-panel'
import { RecordChatterPanel } from '@/src/modules/portal/ui/record-chatter-panel'
import { RecordDetailTabs } from '@/src/modules/portal/ui/record-detail-tabs'
import { useChatterNotificationsOptional } from '@/src/modules/portal/ui/chatter-notifications-context'
import { PortalSideDrawer } from '@/src/modules/portal/ui/portal-side-drawer'
import { getTramiteListItemStateBadge } from '@/src/modules/tramites/domain/filter-tramites'
import type { TramiteListItem } from '@/src/modules/tramites/domain/merge-tramites-list'
import { getTramiteListRecordKind } from '@/src/modules/tramites/domain/merge-tramites-list'
import { classifyDocumentPreview } from '@/src/modules/portal/domain/classify-document-preview'
import { notificationMatchesTramiteRecord } from '@/src/modules/portal/domain/compute-portal-notifications'
import {
  portalAttachmentFromChatterRef,
  type PortalChatterAttachmentRef,
} from '@/src/modules/portal/domain/portal-chatter-types'
import type { PortalAttachment } from '@/src/modules/portal/domain/portal-record-types'
import { DocumentPreviewDialog } from '@/src/modules/portal/ui/document-preview/document-preview-dialog'
import { TaskStateBadge } from '@/src/modules/tramites/ui/task-state-badge'
import { TramiteTypeBadge } from '@/src/modules/tramites/ui/tramite-type-badge'

type TramiteDetailTab = 'conversation' | 'documents'

type TramiteDetailDrawerProps = {
  item: TramiteListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: TramiteDetailTab
  onAttachmentCountChange?: (item: TramiteListItem, attachmentCount: number) => void
  pageItems?: TramiteListItem[]
  pageItemIndex?: number
  onNavigateItem?: (item: TramiteListItem) => void
}

export function TramiteDetailDrawer({
  item,
  open,
  onOpenChange,
  initialTab = 'conversation',
  onAttachmentCountChange,
  pageItems = [],
  pageItemIndex = -1,
  onNavigateItem,
}: TramiteDetailDrawerProps) {
  const notifications = useChatterNotificationsOptional()
  const [zipError, setZipError] = useState<string | null>(null)
  const [zipPending, startZipTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<TramiteDetailTab>(initialTab)
  const [scrollPin, setScrollPin] = useState(0)
  const documentsAckRef = useRef<string | null>(null)

  const [highlightAttachmentId, setHighlightAttachmentId] = useState<number | null>(
    null
  )
  const [previewAttachment, setPreviewAttachment] = useState<PortalAttachment | null>(
    null
  )
  const [previewOpen, setPreviewOpen] = useState(false)
  const [liveAttachmentCount, setLiveAttachmentCount] = useState(0)
  const [attachmentsRefreshToken, setAttachmentsRefreshToken] = useState(0)

  useEffect(() => {
    if (!item) return
    setLiveAttachmentCount(item.attachmentCount)
  }, [item?.attachmentCount, item?.id])

  const ackDocumentsIfNeeded = useCallback(
    (item: TramiteListItem) => {
      const ackKey = `${item.kind}:${item.id}`
      if (documentsAckRef.current === ackKey) return
      documentsAckRef.current = ackKey
      void notifications?.ackDocumentsSeen?.(
        item.kind,
        item.id,
        liveAttachmentCount
      )
    },
    [liveAttachmentCount, notifications]
  )

  useEffect(() => {
    if (!item) return
    setActiveTab(initialTab)
    setScrollPin(0)
    setZipError(null)
    documentsAckRef.current = null
    setHighlightAttachmentId(null)
    setPreviewAttachment(null)
    setPreviewOpen(false)
  }, [item?.id, item?.kind, initialTab])

  const recordKind = item ? getTramiteListRecordKind(item) : 'task'
  const recordId = item?.id ?? 0
  const markConversationSeen = notifications?.markConversationSeen
  const dismissNewTramiteNotification =
    notifications?.dismissNewTramiteNotification
  const ackStatusChangeSeen = notifications?.ackStatusChangeSeen

  // Calculado en el render (no solo dentro del efecto) para que el valor
  // llegue a RecordChatterPanel como prop antes de que el ack de abajo lo
  // retire de `unread` — evita una carrera entre "marcar visto" y "cargar
  // el mensaje nuevo en el chat ya abierto".
  const chatterNotification = item
    ? notifications?.unread.find(
        (notification) =>
          notification.reason === 'unread_chatter' &&
          notificationMatchesTramiteRecord(notification, recordKind, item.id)
      )
    : undefined

  useEffect(() => {
    if (!open || !item) return

    if (chatterNotification?.latestMessageId) {
      void markConversationSeen?.(
        recordKind,
        item.id,
        chatterNotification.latestMessageId
      )
    }

    if (notifications?.hasTramiteNotification(item, 'status_change')) {
      void ackStatusChangeSeen?.(item.kind, item.id)
    }
  }, [
    ackStatusChangeSeen,
    chatterNotification,
    item,
    markConversationSeen,
    notifications?.hasTramiteNotification,
    open,
    recordKind,
  ])

  const handleConversationViewed = useCallback(
    (latestMessageId: number) => {
      if (!recordId) return
      void markConversationSeen?.(recordKind, recordId, latestMessageId)
    },
    [markConversationSeen, recordKind, recordId]
  )

  useEffect(() => {
    if (!open || !item || item.kind !== 'tramite') return
    dismissNewTramiteNotification?.(recordKind, item.id)
  }, [dismissNewTramiteNotification, item?.id, item?.kind, open, recordKind])

  useEffect(() => {
    if (!open || !item || activeTab !== 'documents') return
    ackDocumentsIfNeeded(item)
  }, [ackDocumentsIfNeeded, activeTab, item, open])

  if (!item) {
    return null
  }

  const tramite = item
  const stateBadge = getTramiteListItemStateBadge(tramite)
  const showZipButton = liveAttachmentCount > 1
  const canReply = !(tramite.kind === 'consulta' && tramite.isClosed)
  const conversationUnread =
    notifications?.hasUnreadChatter(recordKind, tramite.id) ?? false

  const pageTotal = pageItems.length
  const showPageNav =
    Boolean(onNavigateItem) && pageTotal > 0 && pageItemIndex >= 0
  const canGoPrevious = showPageNav && pageItemIndex > 0
  const canGoNext = showPageNav && pageItemIndex < pageTotal - 1
  const navCopy = tramites.list.detailNav

  function handleGoPrevious() {
    if (!canGoPrevious || !onNavigateItem) return
    onNavigateItem(pageItems[pageItemIndex - 1]!)
  }

  function handleGoNext() {
    if (!canGoNext || !onNavigateItem) return
    onNavigateItem(pageItems[pageItemIndex + 1]!)
  }

  function handleAttachmentsChanged(attachmentCount: number) {
    setLiveAttachmentCount(attachmentCount)
    setAttachmentsRefreshToken((value) => value + 1)
    onAttachmentCountChange?.(tramite, attachmentCount)
  }

  function handleOpenAttachment(attachment: PortalChatterAttachmentRef) {
    const portalAttachment = portalAttachmentFromChatterRef(attachment)
    if (classifyDocumentPreview(portalAttachment).canPreview) {
      setPreviewAttachment(portalAttachment)
      setPreviewOpen(true)
      return
    }

    setHighlightAttachmentId(attachment.id)
    setActiveTab('documents')
    ackDocumentsIfNeeded(tramite)
  }

  function handleTabChange(tab: TramiteDetailTab) {
    setActiveTab(tab)
    if (tab === 'conversation') {
      setScrollPin((value) => value + 1)
    }
    if (tab === 'documents') {
      ackDocumentsIfNeeded(tramite)
    }
  }

  function handleDownloadZip() {
    const recordId = tramite.id
    const recordName = tramite.name

    setZipError(null)
    startZipTransition(async () => {
      const result = await downloadAllAttachmentsZipAction({
        kind: recordKind,
        recordId,
        recordName,
      })

      if (!result.ok) {
        const errorKey =
          result.error === 'no_attachments' ? 'emptyAttachments' : result.error
        setZipError(
          portalDocuments.errors[errorKey as keyof typeof portalDocuments.errors] ??
            portalDocuments.errors.odoo_unavailable
        )
        return
      }

      triggerBase64Download(
        result.filename,
        result.mimetype,
        result.dataBase64
      )
    })
  }

  return (
    <PortalSideDrawer open={open} onOpenChange={onOpenChange} size="wide">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-5 text-left dark:border-border/50">
          <DialogTitle className="text-pretty pr-8">{tramite.name}</DialogTitle>
          <DialogDescription asChild>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <TramiteTypeBadge kind={tramite.kind} />
                <TaskStateBadge
                  label={stateBadge.label}
                  variant={stateBadge.variant}
                />
              </div>

              {showPageNav ? (
                <div
                  className="flex items-center gap-1"
                  role="navigation"
                  aria-label={navCopy.positionLabel
                    .replace('{current}', String(pageItemIndex + 1))
                    .replace('{total}', String(pageTotal))}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={!canGoPrevious}
                    onClick={handleGoPrevious}
                    aria-label={navCopy.previous}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                  </Button>
                  <span
                    className="min-w-[3.25rem] text-center text-xs tabular-nums text-muted-foreground"
                    aria-hidden
                  >
                    {pageItemIndex + 1}/{pageTotal}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    disabled={!canGoNext}
                    onClick={handleGoNext}
                    aria-label={navCopy.next}
                  >
                    <ChevronRight className="size-4" aria-hidden />
                  </Button>
                </div>
              ) : null}
            </div>
          </DialogDescription>
        </DialogHeader>

        <RecordDetailTabs
          tabs={[
            {
              id: 'conversation',
              label: portalChatter.tabConversation,
              icon: MessageSquare,
              badge: conversationUnread ? 1 : undefined,
            },
            {
              id: 'documents',
              label: portalDocuments.tabLabel,
              icon: FileText,
              badge: liveAttachmentCount,
            },
          ]}
          value={activeTab}
          onChange={handleTabChange}
        >
          {activeTab === 'conversation' ? (
            <RecordChatterPanel
              kind={recordKind}
              recordId={tramite.id}
              active={open}
              canReply={canReply}
              notifyPartnerIds={tramite.assignedNotifyPartnerIds}
              scrollPin={scrollPin}
              markReadOnView={open && activeTab === 'conversation'}
              onConversationViewed={handleConversationViewed}
              onOpenAttachment={handleOpenAttachment}
              onAttachmentsChanged={handleAttachmentsChanged}
              latestKnownMessageId={chatterNotification?.latestMessageId}
            />
          ) : (
            <section
              aria-labelledby="tramite-documents-heading"
              className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain"
            >
              <div className="flex items-center justify-between gap-3 px-6 py-4">
                <h3
                  id="tramite-documents-heading"
                  className="font-sans text-sm font-semibold text-foreground"
                >
                  {portalDocuments.attachmentsTitle}
                </h3>
                {showZipButton ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={zipPending}
                    onClick={handleDownloadZip}
                  >
                    {zipPending ? (
                      <Loader2
                        className="size-4 animate-spin motion-reduce:animate-none"
                        aria-hidden
                      />
                    ) : (
                      <Archive className="size-4" aria-hidden />
                    )}
                    <span className="ml-2">{tramites.list.downloadZip}</span>
                  </Button>
                ) : null}
              </div>

              {zipError ? (
                <p className="px-6 py-2 text-sm text-destructive" role="alert">
                  {zipError}
                </p>
              ) : null}

              <RecordAttachmentsPanel
                kind={recordKind}
                recordId={tramite.id}
                active={open && activeTab === 'documents'}
                knownAttachmentCount={liveAttachmentCount}
                refreshToken={attachmentsRefreshToken}
                highlightAttachmentId={highlightAttachmentId}
              />
            </section>
          )}
        </RecordDetailTabs>

        <DocumentPreviewDialog
          attachment={previewAttachment}
          kind={recordKind}
          recordId={tramite.id}
          open={previewOpen}
          onOpenChange={(open) => {
            setPreviewOpen(open)
            if (!open) setPreviewAttachment(null)
          }}
        />
    </PortalSideDrawer>
  )
}
