'use client'

import { Fragment, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Mail,
  MailOpen,
  MousePointerClick,
  Send,
  Trash2,
  User,
  XCircle,
} from 'lucide-react'
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
import {
  ONBOARDING_SOLICITUD_NEXT_SHORTCUT,
  ONBOARDING_SOLICITUD_PREV_SHORTCUT,
} from '@/src/modules/onboarding/domain/onboarding-solicitud-shortcuts'
import { formatOnboardingDateLong } from '@/src/modules/onboarding/ui/format-onboarding-date'
import { OnboardingTokenSecret } from '@/src/modules/onboarding/ui/onboarding-token-secret'
import {
  statusClassName,
  statusLabel,
  statusRibbonClassName,
} from '@/src/modules/onboarding/ui/onboarding-status-badge'
import {
  buildPortalShortcutTooltipCopy,
  getPortalShortcutModifierLabelFor,
} from '@/src/modules/portal/domain/portal-shortcut-platform'
import { formatPortalShortcutLabel } from '@/src/modules/portal/domain/portal-shortcuts'
import { PortalActionButton } from '@/src/modules/portal/ui/portal-action-button'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'
import { usePortalShortcutOverlay } from '@/src/modules/portal/ui/portal-shortcut-overlay-context'
import { usePortalShortcut } from '@/src/modules/portal/ui/use-portal-shortcut'

type SolicitudDetailViewProps = {
  initialRow: OnboardingSolicitudRow
  navTokens: string[]
}

const STEP_ORDER: EmailProgressStep[] = ['sent', 'delivered', 'opened', 'clicked']

const STEP_ICON: Record<EmailProgressStep, typeof Send> = {
  sent: Send,
  delivered: CheckCheck,
  opened: MailOpen,
  clicked: MousePointerClick,
}

function EmailProgressBar({ row }: { row: OnboardingSolicitudRow }) {
  const copy = solicitudes.detail
  const timestamps = {
    emailSentAt: row.emailSentAt,
    emailDeliveredAt: row.emailDeliveredAt,
    emailOpenedAt: row.emailOpenedAt,
    emailClickedAt: row.emailClickedAt,
    emailBouncedAt: row.emailBouncedAt,
    emailComplainedAt: row.emailComplainedAt,
  }
  const currentStep = deriveEmailProgressStep(timestamps)
  const failure = deriveEmailFailure(timestamps)
  const currentIndex = currentStep ? STEP_ORDER.indexOf(currentStep) : -1
  const opened = currentStep === 'opened'

  return (
    <div className="portal-home-card rounded-xl p-6">
      <h2 className="font-sans text-base font-medium text-foreground">
        {copy.progressTitle}
      </h2>

      {currentIndex === -1 ? (
        <p className="mt-4 text-sm text-muted-foreground">{copy.notSentYet}</p>
      ) : (
        <div className="mt-7 flex items-start">
          {STEP_ORDER.map((step, index) => {
            const reached = index <= currentIndex
            const isCurrent = index === currentIndex
            const Icon = STEP_ICON[step]
            return (
              <Fragment key={step}>
                <div className="flex flex-col items-center gap-2.5">
                  <div className="relative flex size-10 items-center justify-center">
                    {isCurrent ? (
                      <span
                        className="absolute inset-0 rounded-full bg-primary/60 motion-safe:animate-ping"
                        aria-hidden
                      />
                    ) : null}
                    <div
                      className={cn(
                        'relative flex size-10 items-center justify-center rounded-full border transition-colors duration-300',
                        isCurrent
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </div>
                  </div>
                  <span
                    className={cn(
                      'text-sm whitespace-nowrap',
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
                      'mt-5 h-1 flex-1 rounded-full transition-colors duration-300',
                      index < currentIndex ? 'bg-primary' : 'bg-border'
                    )}
                    aria-hidden
                  />
                ) : null}
              </Fragment>
            )
          })}
        </div>
      )}

      {opened ? (
        <div className="status-banner status-banner-info mt-6">
          <MailOpen className="status-banner-icon mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-medium">{copy.openedBanner.title}.</span>{' '}
            {copy.openedBanner.note}
          </p>
        </div>
      ) : null}

      {failure ? (
        <div className="status-banner status-banner-destructive mt-6">
          <AlertTriangle className="status-banner-icon mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <span className="font-medium">{copy.failure[failure].title}.</span>{' '}
            {copy.failure[failure].note}
          </p>
        </div>
      ) : null}
    </div>
  )
}

export function SolicitudDetailView({
  initialRow,
  navTokens,
}: SolicitudDetailViewProps) {
  const copy = solicitudes.detail
  const listCopy = solicitudes.list
  const router = useRouter()
  const [row, setRow] = useState(initialRow)
  const [pendingAction, setPendingAction] = useState<
    'resend' | 'revoke' | 'delete' | null
  >(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const overlayActive = usePortalShortcutOverlay()

  const currentIndex = useMemo(
    () => navTokens.indexOf(row.token),
    [navTokens, row.token]
  )
  const prevToken = currentIndex > 0 ? navTokens[currentIndex - 1] : null
  const nextToken =
    currentIndex !== -1 && currentIndex < navTokens.length - 1
      ? navTokens[currentIndex + 1]
      : null

  function goToToken(token: string | null) {
    if (!token) return
    router.push(`/solicitudes/${token}`)
  }

  usePortalShortcut(ONBOARDING_SOLICITUD_PREV_SHORTCUT, () => goToToken(prevToken), {
    enabled: Boolean(prevToken),
  })
  usePortalShortcut(ONBOARDING_SOLICITUD_NEXT_SHORTCUT, () => goToToken(nextToken), {
    enabled: Boolean(nextToken),
  })

  const prevShortcutLabel = formatPortalShortcutLabel(
    ONBOARDING_SOLICITUD_PREV_SHORTCUT
  )
  const nextShortcutLabel = formatPortalShortcutLabel(
    ONBOARDING_SOLICITUD_NEXT_SHORTCUT
  )
  const prevTooltipCopy = buildPortalShortcutTooltipCopy(
    copy.nav,
    copy.nav.previousHint,
    prevShortcutLabel,
    getPortalShortcutModifierLabelFor(ONBOARDING_SOLICITUD_PREV_SHORTCUT)
  )
  const nextTooltipCopy = buildPortalShortcutTooltipCopy(
    copy.nav,
    copy.nav.nextHint,
    nextShortcutLabel,
    getPortalShortcutModifierLabelFor(ONBOARDING_SOLICITUD_NEXT_SHORTCUT)
  )
  const prevTooltip = overlayActive ? prevTooltipCopy.active : prevTooltipCopy.idle
  const nextTooltip = overlayActive ? nextTooltipCopy.active : nextTooltipCopy.idle

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
      <div className="flex items-start justify-between gap-4">
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
          <p className="mt-2 text-xs font-medium tracking-wide text-primary uppercase">
            {copy.eyebrow}
          </p>
          <h1 className="mt-1 font-sans text-2xl font-semibold text-foreground md:text-3xl">
            {row.recipientName ?? listCopy.unknownClient}
          </h1>
        </div>

        {navTokens.length > 1 ? (
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <PortalActionButton
              label={copy.nav.previous}
              compact
              variant="outline"
              size="sm"
              icon={ChevronLeft}
              onClick={() => goToToken(prevToken)}
              disabled={!prevToken}
              shortcut={ONBOARDING_SOLICITUD_PREV_SHORTCUT}
              tooltip={prevTooltip}
              ariaKeyshortcuts={prevShortcutLabel}
            />
            <PortalActionButton
              label={copy.nav.next}
              compact
              variant="outline"
              size="sm"
              icon={ChevronRight}
              onClick={() => goToToken(nextToken)}
              disabled={!nextToken}
              shortcut={ONBOARDING_SOLICITUD_NEXT_SHORTCUT}
              tooltip={nextTooltip}
              ariaKeyshortcuts={nextShortcutLabel}
            />
          </div>
        ) : null}
      </div>

      {row.status === 'active' || row.status === 'expired' ? (
        <EmailProgressBar row={row} />
      ) : null}

      <div className="portal-home-card relative overflow-hidden rounded-xl p-5">
        {row.status !== 'active' ? (
          <div className="pointer-events-none absolute right-0 top-0 h-40 w-40 overflow-hidden">
            <div
              className={cn(
                'absolute -right-[70px] top-7 w-[220px] rotate-45 py-1.5 text-center text-xs leading-none font-semibold tracking-wide uppercase shadow-md',
                statusRibbonClassName(row.status)
              )}
            >
              {statusLabel(row.status)}
            </div>
          </div>
        ) : null}
        <h2 className="font-sans text-sm font-medium text-foreground">
          {copy.infoTitle}
        </h2>
        <dl className="mt-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <User className="size-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <dt className="sr-only">{copy.fields.client}</dt>
                <dd className="truncate text-base font-semibold text-foreground">
                  {row.recipientName ?? listCopy.unknownClient}
                </dd>
                <dt className="sr-only">{copy.fields.email}</dt>
                <dd className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
                  <Mail className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{row.recipientEmail ?? '—'}</span>
                </dd>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <KeyRound className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {copy.fields.code}
                </dt>
                <dd className="mt-1">
                  <OnboardingTokenSecret token={row.token} size="lg" />
                </dd>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-4 text-xs text-muted-foreground dark:border-border/50">
            {row.status === 'active' ? (
              <div>
                <dt className="sr-only">{copy.fields.status}</dt>
                <dd
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 font-medium',
                    statusClassName(row.status)
                  )}
                >
                  {statusLabel(row.status)}
                </dd>
              </div>
            ) : null}
            {row.status === 'active' ? (
              <span aria-hidden className="text-border">
                •
              </span>
            ) : null}
            <div>
              <dt className="sr-only">{copy.fields.created}</dt>
              <dd>
                {copy.fields.created} {formatOnboardingDateLong(row.createdAt)}
              </dd>
            </div>
            {row.status === 'active' || row.status === 'expired' ? (
              <>
                <span aria-hidden className="text-border">
                  •
                </span>
                <div>
                  <dt className="sr-only">{copy.fields.expires}</dt>
                  <dd>
                    {copy.fields.expires} {formatOnboardingDateLong(row.expiresAt)}
                  </dd>
                </div>
              </>
            ) : null}
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
