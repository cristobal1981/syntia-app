'use client'

import { useState } from 'react'
import { RefreshCw, Send, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { solicitudes } from '@/content/solicitudes'
import {
  deleteOnboardingSolicitudAction,
  listOnboardingSolicitudesAction,
  renewExpiredOnboardingSolicitudAction,
  resendOnboardingSolicitudLinkAction,
  revokeOnboardingSolicitudAction,
  type OnboardingSolicitudRow,
} from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'

export function OnboardingSolicitudRowActions({
  row,
  onUpdated,
}: {
  row: OnboardingSolicitudRow
  onUpdated: (rows: OnboardingSolicitudRow[]) => void
}) {
  const copy = solicitudes.list
  const [pendingAction, setPendingAction] = useState<
    'resend' | 'revoke' | 'delete' | 'renew' | null
  >(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  async function refreshRows() {
    const result = await listOnboardingSolicitudesAction()
    if (result.ok) {
      onUpdated(result.rows)
    }
  }

  async function handleResend() {
    setPendingAction('resend')
    const result = await resendOnboardingSolicitudLinkAction(row.token)
    setPendingAction(null)
    if (!result.ok) {
      toast.error(copy.resendError)
      return
    }
    toast.success(copy.resendSuccess)
    await refreshRows()
  }

  async function handleRenew() {
    setPendingAction('renew')
    const result = await renewExpiredOnboardingSolicitudAction(row.token)
    setPendingAction(null)
    if (!result.ok) {
      toast.error(result.message ?? copy.renewError)
      return
    }
    toast.success(copy.renewSuccess)
    await refreshRows()
  }

  async function handleRevoke() {
    setPendingAction('revoke')
    const result = await revokeOnboardingSolicitudAction(row.token)
    setPendingAction(null)
    if (!result.ok) {
      toast.error(copy.revokeError)
      return
    }
    toast.success(copy.revokeSuccess)
    await refreshRows()
  }

  async function handleDelete() {
    setPendingAction('delete')
    const result = await deleteOnboardingSolicitudAction(row.token)
    setPendingAction(null)
    if (!result.ok) {
      toast.error(copy.deleteError)
      return
    }
    toast.success(copy.deleteSuccess)
    await refreshRows()
  }

  return (
    <div
      className="flex flex-wrap items-center justify-end gap-1"
      onClick={(event) => event.stopPropagation()}
    >
      {row.status === 'active' ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={pendingAction !== null}
          aria-label={pendingAction === 'resend' ? copy.actions.sendingLink : copy.actions.sendLink}
          className="h-8 gap-1 px-2"
        >
          <Send className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">
            {pendingAction === 'resend' ? copy.actions.sendingLink : copy.actions.sendLink}
          </span>
        </Button>
      ) : null}
      {row.status === 'expired' ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRenew}
          disabled={pendingAction !== null}
          aria-label={pendingAction === 'renew' ? copy.actions.renewing : copy.actions.renew}
          className="h-8 gap-1 px-2"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">
            {pendingAction === 'renew' ? copy.actions.renewing : copy.actions.renew}
          </span>
        </Button>
      ) : null}
      {row.status === 'active' ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRevoke}
          disabled={pendingAction !== null}
          aria-label={pendingAction === 'revoke' ? copy.actions.revoking : copy.actions.revoke}
          className="h-8 gap-1 px-2"
        >
          <XCircle className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">
            {pendingAction === 'revoke' ? copy.actions.revoking : copy.actions.revoke}
          </span>
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setDeleteConfirmOpen(true)}
        disabled={pendingAction !== null}
        aria-label={pendingAction === 'delete' ? copy.actions.deleting : copy.actions.delete}
        title={pendingAction === 'delete' ? copy.actions.deleting : copy.actions.delete}
        className="h-8 w-8 px-0 text-destructive hover:text-destructive"
      >
        <Trash2 className="size-3.5" aria-hidden />
      </Button>
      <PortalConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={copy.actions.delete}
        description={copy.deleteConfirm}
        confirmLabel={copy.actions.delete}
        confirmVariant="destructive"
        onConfirm={() => {
          void handleDelete()
        }}
      />
    </div>
  )
}
