'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { Copy, Plus, Trash2, XCircle } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { solicitudes } from '@/content/solicitudes'
import { cn } from '@/lib/utils'
import type { ClientRecord } from '@/src/modules/directory/domain/types'
import {
  createAltaAutonomoAccessLinkAction,
  deleteOnboardingSolicitudAction,
  listOnboardingSolicitudesAction,
  revokeOnboardingSolicitudAction,
  type OnboardingSolicitudRow,
} from '@/src/modules/onboarding/application/onboarding-solicitudes-actions'
import type { OnboardingTokenStatus } from '@/src/modules/onboarding/domain/onboarding-token-status'
import { OnboardingTokenSecret } from '@/src/modules/onboarding/ui/onboarding-token-secret'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'
import { PortalFilterChip } from '@/src/modules/portal/ui/portal-filter-chip'

type SolicitudesPageViewProps = {
  initialClients: ClientRecord[]
  initialRows: OnboardingSolicitudRow[]
}

type ListFilter = 'pending' | 'all'
const UNSELECTED_CLIENT_VALUE = '__unselected_client__'

function formatDateTime(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function statusLabel(status: OnboardingTokenStatus): string {
  return solicitudes.list.status[status]
}

function statusClassName(status: OnboardingTokenStatus): string {
  switch (status) {
    case 'active':
      return 'bg-primary/10 text-primary'
    case 'used':
      return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
    case 'revoked':
      return 'bg-muted text-muted-foreground'
    case 'expired':
      return 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
  }
}

function AltaAutonomoCreateDialog({
  open,
  clients,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  clients: ClientRecord[]
  onOpenChange: (open: boolean) => void
  onCreated: (rows: OnboardingSolicitudRow[]) => void
}) {
  const copy = solicitudes.altaAutonomo
  const [clientId, setClientId] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [pending, startTransition] = useTransition()

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [clients]
  )
  const selectedClientName = useMemo(
    () => sortedClients.find((client) => client.id === clientId)?.name ?? '—',
    [clientId, sortedClients]
  )

  useEffect(() => {
    if (!open) {
      setClientId('')
      setLinkUrl('')
    }
  }, [open])

  function handleGenerateLink() {
    if (!clientId) return
    startTransition(async () => {
      const result = await createAltaAutonomoAccessLinkAction(clientId)
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

        {sortedClients.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.noClients}</p>
        ) : (
          <div className="flex flex-col gap-4">
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
                <p className="mt-1 text-sm text-foreground">{selectedClientName}</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <label htmlFor="solicitud-client" className="text-sm font-medium">
                  {copy.clientLabel}
                </label>
                <Select
                  value={clientId || UNSELECTED_CLIENT_VALUE}
                  onValueChange={(next) => {
                    if (next === UNSELECTED_CLIENT_VALUE) return
                    setClientId(next)
                    setLinkUrl('')
                  }}
                >
                  <SelectTrigger
                    id="solicitud-client"
                    aria-label={copy.clientLabel}
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <SelectValue placeholder={copy.clientPlaceholder} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UNSELECTED_CLIENT_VALUE} disabled>
                      {copy.clientPlaceholder}
                    </SelectItem>
                    {sortedClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {linkUrl ? <input type="hidden" readOnly value={linkUrl} aria-hidden /> : null}
          </div>
        )}

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
          {sortedClients.length > 0 && !linkUrl ? (
            <Button
              type="button"
              className="order-1"
              onClick={handleGenerateLink}
              disabled={pending || !clientId}
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
  const [pendingAction, setPendingAction] = useState<'revoke' | 'delete' | null>(
    null
  )
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  async function refreshRows() {
    const result = await listOnboardingSolicitudesAction()
    if (result.ok) {
      onUpdated(result.rows)
    }
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
    <div className="flex flex-wrap gap-1">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled
        className="h-8 gap-1 px-2"
      >
        {copy.actions.sendLink}
      </Button>
      {row.status === 'active' ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRevoke}
          disabled={pendingAction !== null}
          className="h-8 gap-1 px-2"
        >
          <XCircle className="size-3.5" aria-hidden />
          {pendingAction === 'revoke' ? copy.actions.revoking : copy.actions.revoke}
        </Button>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setDeleteConfirmOpen(true)}
        disabled={pendingAction !== null}
        className="h-8 gap-1 px-2 text-destructive hover:text-destructive"
      >
        <Trash2 className="size-3.5" aria-hidden />
        {pendingAction === 'delete' ? copy.actions.deleting : copy.actions.delete}
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
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead>
          <tr className="border-b border-border dark:border-border/50">
            {Object.values(copy.columns).map((header) => (
              <th
                key={header}
                scope="col"
                className="px-4 py-3 font-sans font-medium text-muted-foreground"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((row) => (
            <tr
              key={row.token}
              className="border-b border-border last:border-b-0 dark:border-border/50"
            >
              <td className="px-4 py-3 text-foreground">
                {row.clientName ?? copy.unknownClient}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {row.recipientEmail ?? '—'}
              </td>
              <td className="px-4 py-3">
                <OnboardingTokenSecret token={row.token} />
              </td>
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                    statusClassName(row.status)
                  )}
                >
                  {statusLabel(row.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDateTime(row.createdAt)}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {formatDateTime(row.expiresAt)}
              </td>
              <td className="px-4 py-3">
                <OnboardingSolicitudRowActions row={row} onUpdated={onUpdated} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function SolicitudesPageView({
  initialClients,
  initialRows,
}: SolicitudesPageViewProps) {
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
        clients={initialClients}
        onOpenChange={setCreateOpen}
        onCreated={setRows}
      />
    </div>
  )
}
