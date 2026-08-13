'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Copy, Loader2, Plus, Send, Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { solicitudes } from '@/content/solicitudes'
import { cn } from '@/lib/utils'
import { listOdooPartnersForImportAction } from '@/src/modules/directory/application/directory-mutations'
import type { OdooPartnerImportOption } from '@/src/modules/directory/domain/odoo-partner-import'
import { OdooPartnerImportPicker } from '@/src/modules/directory/ui/odoo-partner-import-picker'
import {
  createAltaAutonomoAccessLinkAction,
  deleteOnboardingSolicitudAction,
  listOnboardingSolicitudesAction,
  resendOnboardingSolicitudLinkAction,
  revokeOnboardingSolicitudAction,
  type OnboardingSolicitudRow,
} from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import { formatOnboardingDateNumeric } from '@/src/modules/onboarding/ui/format-onboarding-date'
import { OnboardingTokenSecret } from '@/src/modules/onboarding/ui/onboarding-token-secret'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'

type SolicitudesPageViewProps = {
  initialRows: OnboardingSolicitudRow[]
}

type ListFilter = 'pending' | 'all'
type OdooImportLoadState = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'

function AltaAutonomoCreateDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (rows: OnboardingSolicitudRow[]) => void
}) {
  const copy = solicitudes.altaAutonomo
  const [partners, setPartners] = useState<OdooPartnerImportOption[]>([])
  const [loadState, setLoadState] = useState<OdooImportLoadState>('idle')
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [pending, startTransition] = useTransition()

  const selectedPartner = useMemo(
    () => partners.find((partner) => partner.id === selectedPartnerId) ?? null,
    [partners, selectedPartnerId]
  )

  useEffect(() => {
    if (!open) {
      setSelectedPartnerId(null)
      setLinkUrl('')
      setLoadState('idle')
      setPartners([])
      return
    }

    let cancelled = false
    setLoadState('loading')

    void listOdooPartnersForImportAction({ includeLinked: true }).then((result) => {
      if (cancelled) return

      if (!result.ok) {
        if (result.error === 'odoo_unavailable') {
          setLoadState('unavailable')
          return
        }
        setLoadState('error')
        return
      }

      setPartners(result.partners)
      setLoadState('ready')
    })

    return () => {
      cancelled = true
    }
  }, [open])

  function handleGenerateLink() {
    if (!selectedPartner) return
    startTransition(async () => {
      const result = await createAltaAutonomoAccessLinkAction({
        odooPartnerId: selectedPartner.id,
        label: selectedPartner.label,
        contactEmail: selectedPartner.contactEmail,
        corporateEmail: selectedPartner.corporateEmail,
      })
      if (!result.ok) {
        toast.error(result.message ?? copy.generateError)
        return
      }
      setLinkUrl(result.url)
      toast.success(copy.generated)
      const listResult = await listOnboardingSolicitudesAction()
      if (listResult.ok) {
        onCreated(listResult.rows)
      }
    })
  }

  async function handleCopyLink() {
    const value = linkUrl.trim()
    if (!value) return

    // Try sync fallback first to keep browser user-gesture context.
    const textarea = document.createElement('textarea')
    textarea.value = value
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    let copied = false
    try {
      copied = document.execCommand('copy')
    } finally {
      document.body.removeChild(textarea)
    }

    if (!copied && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value)
        copied = true
      } catch {
        copied = false
      }
    }

    if (copied) {
      toast.success(copy.linkCopied)
      return
    }
    toast.error(copy.copyLinkError)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.modalTitle}</DialogTitle>
          <DialogDescription>{copy.modalDescription}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {loadState === 'loading' ? (
            <p className="text-sm text-muted-foreground">{copy.loading}</p>
          ) : null}
          {loadState === 'unavailable' ? (
            <p className="text-sm text-muted-foreground">{copy.unavailable}</p>
          ) : null}
          {loadState === 'error' ? (
            <p className="text-sm text-destructive" role="alert">
              {copy.error}
            </p>
          ) : null}
          {loadState === 'ready' && partners.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.empty}</p>
          ) : null}

          {linkUrl ? (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <p className="text-sm font-medium text-foreground">
                {copy.generatedStateTitle}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.generatedStateDescription}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {copy.clientLabel}
              </p>
              <p className="mt-1 text-sm text-foreground">
                {selectedPartner?.label ?? '—'}
              </p>
            </div>
          ) : loadState === 'ready' && partners.length > 0 ? (
            <OdooPartnerImportPicker
              partners={partners}
              selectedId={selectedPartnerId}
              onSelect={(partner) => {
                setSelectedPartnerId(partner?.id ?? null)
                setLinkUrl('')
              }}
            />
          ) : null}

          {linkUrl ? <input type="hidden" readOnly value={linkUrl} aria-hidden /> : null}
        </div>

        <DialogFooter className="flex-row items-center justify-end">
          {linkUrl ? (
            <Button
              type="button"
              variant="secondary"
              className="order-1 flex-1 gap-2"
              onClick={handleCopyLink}
            >
              <Copy className="size-4" aria-hidden />
              {copy.copyLink}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            className="order-2 w-auto flex-none"
            onClick={() => onOpenChange(false)}
          >
            Cerrar
          </Button>
          {!linkUrl ? (
            <Button
              type="button"
              className="order-1"
              onClick={handleGenerateLink}
              disabled={pending || !selectedPartner}
              aria-busy={pending}
            >
              {pending ? copy.creating : copy.createButton}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function OnboardingSolicitudRowActions({
  row,
  onUpdated,
}: {
  row: OnboardingSolicitudRow
  onUpdated: (rows: OnboardingSolicitudRow[]) => void
}) {
  const copy = solicitudes.list
  const [pendingAction, setPendingAction] = useState<'resend' | 'revoke' | 'delete' | null>(
    null
  )
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

function OnboardingSolicitudTable({
  rows,
  filter,
  onUpdated,
}: {
  rows: OnboardingSolicitudRow[]
  filter: ListFilter
  onUpdated: (rows: OnboardingSolicitudRow[]) => void
}) {
  const copy = solicitudes.list
  const router = useRouter()
  const pathname = usePathname()
  const [navigatingToken, setNavigatingToken] = useState<string | null>(null)

  useEffect(() => {
    setNavigatingToken(null)
  }, [pathname])

  function handleRowOpen(token: string) {
    if (navigatingToken) return
    setNavigatingToken(token)
    router.push(`/solicitudes/${token}`)
  }

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter((row) => row.status === 'active')
  }, [filter, rows])

  if (filteredRows.length === 0) {
    return (
      <div className="portal-home-card rounded-xl px-5 py-10 text-center">
        <p className="font-sans text-base font-medium text-foreground">
          {filter === 'pending' ? copy.emptyPendingTitle : copy.emptyAllTitle}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {filter === 'pending'
            ? copy.emptyPendingDescription
            : copy.emptyAllDescription}
        </p>
      </div>
    )
  }

  return (
    <div className="portal-home-card overflow-x-auto rounded-xl">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-border dark:border-border/50">
            {Object.entries(copy.columns).map(([key, header]) => (
              <th
                key={key}
                scope="col"
                className={cn(
                  'px-4 py-3 font-sans font-medium text-muted-foreground',
                  key === 'actions' && 'text-right'
                )}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => {
            const isNavigating = navigatingToken === row.token
            return (
            <tr
              key={row.token}
              onClick={() => handleRowOpen(row.token)}
              aria-busy={isNavigating}
              className={cn(
                'cursor-pointer border-b border-border last:border-b-0 hover:bg-muted/40 dark:border-border/50',
                isNavigating && 'bg-muted/40',
                navigatingToken && !isNavigating && 'pointer-events-none opacity-50'
              )}
            >
              <td className="max-w-[160px] truncate px-4 py-3 text-foreground sm:max-w-[220px]">
                <span className="inline-flex items-center gap-2">
                  {row.recipientName ?? copy.unknownClient}
                  {isNavigating ? (
                    <Loader2
                      className="size-3.5 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                  ) : null}
                </span>
              </td>
              <td
                className="max-w-[140px] truncate px-4 py-3 text-muted-foreground sm:max-w-[240px]"
                title={row.recipientEmail ?? undefined}
              >
                {row.recipientEmail ?? '—'}
              </td>
              <td
                className="px-4 py-3"
                onClick={(event) => event.stopPropagation()}
              >
                <OnboardingTokenSecret
                  token={row.token}
                  className="min-w-0 sm:min-w-[12rem]"
                />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                {formatOnboardingDateNumeric(row.expiresAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <OnboardingSolicitudRowActions row={row} onUpdated={onUpdated} />
              </td>
            </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function SolicitudesPageView({ initialRows }: SolicitudesPageViewProps) {
  const copy = solicitudes.page
  const altaCopy = solicitudes.altaAutonomo
  const listCopy = solicitudes.list
  const [rows, setRows] = useState(initialRows)
  const [filter, setFilter] = useState<ListFilter>('pending')
  const [createOpen, setCreateOpen] = useState(false)

  const pendingCount = useMemo(
    () => rows.filter((row) => row.status === 'active').length,
    [rows]
  )

  return (
    <div className="flex flex-col gap-6">
      <header className="max-w-2xl">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {copy.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {copy.description}
        </p>
      </header>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <PortalFilterChip
              label={listCopy.filterPending}
              count={pendingCount}
              active={filter === 'pending'}
              onClick={() => setFilter('pending')}
            />
            <PortalFilterChip
              label={listCopy.filterAll}
              count={rows.length}
              active={filter === 'all'}
              onClick={() => setFilter('all')}
            />
          </div>
          <Button
            type="button"
            className="gap-2 self-start sm:self-auto"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="size-4" aria-hidden />
            {altaCopy.newButton}
          </Button>
        </div>

        <OnboardingSolicitudTable rows={rows} filter={filter} onUpdated={setRows} />
      </div>

      <AltaAutonomoCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={setRows}
      />
    </div>
  )
}
