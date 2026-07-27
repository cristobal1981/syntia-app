'use client'

import { Fragment, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { solicitudes } from '@/content/solicitudes'
import { cn } from '@/lib/utils'
import {
  deleteOnboardingSolicitudAction,
  getOnboardingSolicitudDetailAction,
  resendOnboardingSolicitudLinkAction,
  revokeOnboardingSolicitudAction,
  type OnboardingSolicitudRow,
} from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import {
  deriveEmailFailure,
  deriveEmailProgressStep,
  type EmailProgressStep,
} from '@/src/modules/onboarding/domain/onboarding-email-progress'
import { formatOnboardingDateLong } from '@/src/modules/onboarding/ui/format-onboarding-date'
import { OnboardingTokenSecret } from '@/src/modules/onboarding/ui/onboarding-token-secret'
import { statusClassName, statusLabel } from '@/src/modules/onboarding/ui/onboarding-status-badge'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'

type SolicitudDetailViewProps = {
  initialRow: OnboardingSolicitudRow
}

const STEP_ORDER: EmailProgressStep[] = ['sent', 'delivered', 'opened', 'clicked']

function EmailProgressBar({ row }: { row: OnboardingSolicitudRow }) {
  const copy = solicitudes.detail
  const currentStep = deriveEmailProgressStep({
    emailSentAt: row.emailSentAt,
    emailDeliveredAt: row.emailDeliveredAt,
    emailOpenedAt: row.emailOpenedAt,
    emailClickedAt: row.emailClickedAt,
    emailBouncedAt: row.emailBouncedAt,
    emailComplainedAt: row.emailComplainedAt,
  })
  const failure = deriveEmailFailure({
    emailSentAt: row.emailSentAt,
    emailDeliveredAt: row.emailDeliveredAt,
    emailOpenedAt: row.emailOpenedAt,
    emailClickedAt: row.emailClickedAt,
    emailBouncedAt: row.emailBouncedAt,
    emailComplainedAt: row.emailComplainedAt,
  })
  const currentIndex = currentStep ? STEP_ORDER.indexOf(currentStep) : -1

  return (
    <div className="portal-home-card rounded-xl p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-sans text-sm font-medium text-foreground">
          {copy.progressTitle}
        </h2>
        {failure ? (
          <span className="inline-flex rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
            {copy.failure[failure]}
          </span>
        ) : null}
      </div>

      {currentIndex === -1 ? (
        <p className="mt-4 text-sm text-muted-foreground">{copy.notSentYet}</p>
      ) : (
        <>
          <div className="mt-5 flex items-center">
            {STEP_ORDER.map((step, index) => {
              const reached = index <= currentIndex
              return (
                <Fragment key={step}>
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        'size-3 rounded-full',
                        reached ? 'bg-primary' : 'bg-muted'
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        'text-xs whitespace-nowrap',
                        reached
                          ? 'font-medium text-foreground'
                          : 'text-muted-foreground'
                      )}
                    >
                      {copy.steps[step]}
                    </span>
                  </div>
                  {index < STEP_ORDER.length - 1 ? (
                    <div
                      className={cn(
                        'mb-4 h-px flex-1',
                        index < currentIndex ? 'bg-primary' : 'bg-border'
                      )}
                      aria-hidden
                    />
                  ) : null}
                </Fragment>
              )
            })}
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            {copy.openedReliabilityNote}
          </p>
        </>
      )}
    </div>
  )
}

export function SolicitudDetailView({ initialRow }: SolicitudDetailViewProps) {
  const copy = solicitudes.detail
  const listCopy = solicitudes.list
  const router = useRouter()
  const [row, setRow] = useState(initialRow)
  const [pendingAction, setPendingAction] = useState<
    'resend' | 'revoke' | 'delete' | null
  >(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  async function refreshRow() {
    const result = await getOnboardingSolicitudDetailAction(row.token)
    if (result.ok) {
      setRow(result.row)
    }
  }

  async function handleResend() {
    setPendingAction('resend')
    const result = await resendOnboardingSolicitudLinkAction(row.token)
    setPendingAction(null)
    if (!result.ok) {
      toast.error(listCopy.resendError)
      return
    }
    toast.success(listCopy.resendSuccess)
    await refreshRow()
  }

  async function handleRevoke() {
    setPendingAction('revoke')
    const result = await revokeOnboardingSolicitudAction(row.token)
    setPendingAction(null)
    if (!result.ok) {
      toast.error(listCopy.revokeError)
      return
    }
    toast.success(listCopy.revokeSuccess)
    await refreshRow()
  }

  async function handleDelete() {
    setPendingAction('delete')
    const result = await deleteOnboardingSolicitudAction(row.token)
    setPendingAction(null)
    if (!result.ok) {
      toast.error(listCopy.deleteError)
      return
    }
    toast.success(listCopy.deleteSuccess)
    router.push('/solicitudes')
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button
          type="button"
          variant="ghost"
          className="gap-2 px-2 text-muted-foreground"
          onClick={() => router.push('/solicitudes')}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {copy.back}
        </Button>
        <h1 className="mt-2 font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {row.clientName ?? listCopy.unknownClient}
        </h1>
      </div>

      <EmailProgressBar row={row} />

      <div className="portal-home-card rounded-xl p-5">
        <h2 className="font-sans text-sm font-medium text-foreground">
          {copy.infoTitle}
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {copy.fields.client}
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {row.clientName ?? listCopy.unknownClient}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {copy.fields.email}
            </dt>
            <dd className="mt-1 text-sm text-foreground">{row.recipientEmail ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {copy.fields.code}
            </dt>
            <dd className="mt-1">
              <OnboardingTokenSecret token={row.token} />
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {copy.fields.status}
            </dt>
            <dd className="mt-1">
              <span
                className={cn(
                  'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                  statusClassName(row.status)
                )}
              >
                {statusLabel(row.status)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {copy.fields.created}
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {formatOnboardingDateLong(row.createdAt)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {copy.fields.expires}
            </dt>
            <dd className="mt-1 text-sm text-foreground">
              {formatOnboardingDateLong(row.expiresAt)}
            </dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5 dark:border-border/50">
          {row.status === 'active' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleResend}
              disabled={pendingAction !== null}
            >
              <Send className="size-3.5" aria-hidden />
              {pendingAction === 'resend'
                ? listCopy.actions.sendingLink
                : listCopy.actions.sendLink}
            </Button>
          ) : null}
          {row.status === 'active' ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleRevoke}
              disabled={pendingAction !== null}
            >
              <XCircle className="size-3.5" aria-hidden />
              {pendingAction === 'revoke'
                ? listCopy.actions.revoking
                : listCopy.actions.revoke}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-destructive hover:text-destructive"
            onClick={() => setDeleteConfirmOpen(true)}
            disabled={pendingAction !== null}
          >
            <Trash2 className="size-3.5" aria-hidden />
            {pendingAction === 'delete'
              ? listCopy.actions.deleting
              : listCopy.actions.delete}
          </Button>
        </div>
      </div>

      <PortalConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={listCopy.actions.delete}
        description={listCopy.deleteConfirm}
        confirmLabel={listCopy.actions.delete}
        confirmVariant="destructive"
        onConfirm={() => {
          void handleDelete()
        }}
      />
    </div>
  )
}
