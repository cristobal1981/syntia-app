'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import { Archive, FileText, Loader2, MessageSquare } from 'lucide-react'

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
import { notificationMatchesTramiteRecord } from '@/src/modules/portal/domain/compute-portal-notifications'
import { TaskStateBadge } from '@/src/modules/tramites/ui/task-state-badge'
import { TramiteTypeBadge } from '@/src/modules/tramites/ui/tramite-type-badge'

type TramiteDetailTab = 'conversation' | 'documents'

type TramiteDetailDrawerProps = {
  item: TramiteListItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  initialTab?: TramiteDetailTab
  onAttachmentCountChange?: (item: TramiteListItem, attachmentCount: number) => void
}

export function TramiteDetailDrawer({
  item,
  open,
  onOpenChange,
  initialTab = 'conversation',
  onAttachmentCountChange,
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
  }, [item?.id, initialTab])

  const recordKind = item ? getTramiteListRecordKind(item) : 'task'
  const recordId = item?.id ?? 0
  const markConversationSeen = notifications?.markConversationSeen
  const dismissNewTramiteNotification =
    notifications?.dismissNewTramiteNotification
  const ackStatusChangeSeen = notifications?.ackStatusChangeSeen

  useEffect(() => {
    if (!open || !item) return

    const chatterNotification = notifications?.unread.find(
      (notification) =>
        notification.reason === 'unread_chatter' &&
        notificationMatchesTramiteRecord(notification, recordKind, item.id)
    )
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
    item,
    markConversationSeen,
    notifications?.hasTramiteNotification,
    notifications?.unread,
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

  function handleAttachmentsChanged(attachmentCount: number) {
    setLiveAttachmentCount(attachmentCount)
    setAttachmentsRefreshToken((value) => value + 1)
    onAttachmentCountChange?.(tramite, attachmentCount)
  }

  function handleOpenDocument(attachmentId: number) {
    setHighlightAttachmentId(attachmentId)
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
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <TramiteTypeBadge kind={tramite.kind} />
              <TaskStateBadge
                label={stateBadge.label}
                variant={stateBadge.variant}
              />
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
              scrollPin={scrollPin}
              markReadOnView={open && activeTab === 'conversation'}
              onConversationViewed={handleConversationViewed}
              onOpenDocument={handleOpenDocument}
              onAttachmentsChanged={handleAttachmentsChanged}
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
    </PortalSideDrawer>
  )
}
