'use client'

import { useMemo, useState, useTransition } from 'react'
import { Trash2, XCircle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

type SolicitudesPageViewProps = {
  initialClients: ClientRecord[]
  initialRows: OnboardingSolicitudRow[]
}

type ListFilter = 'pending' | 'all'

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

function AltaAutonomoLinkPanel({
  clients,
  onCreated,
}: {
  clients: ClientRecord[]
  onCreated: (rows: OnboardingSolicitudRow[]) => void
}) {
  const copy = solicitudes.altaAutonomo
  const [clientId, setClientId] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkToken, setLinkToken] = useState('')
  const [pending, startTransition] = useTransition()

  const sortedClients = useMemo(
    () => [...clients].sort((a, b) => a.name.localeCompare(b.name, 'es')),
    [clients]
  )

  function handleGenerateLink() {
    if (!clientId) return
    startTransition(async () => {
      const result = await createAltaAutonomoAccessLinkAction(clientId)
      if (!result.ok) {
        toast.error(result.message ?? copy.generateError)
        return
      }
      setLinkUrl(result.url)
      setLinkToken(result.token)
      toast.success(copy.generated)
      const listResult = await listOnboardingSolicitudesAction()
      if (listResult.ok) {
        onCreated(listResult.rows)
      }
    })
  }

  return (
    <section className="portal-home-card rounded-xl p-5 md:p-6">
      <h2 className="font-sans text-lg font-semibold text-foreground">
        {copy.sectionTitle}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{copy.sectionDescription}</p>

      {sortedClients.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{copy.noClients}</p>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="solicitud-client" className="text-sm font-medium">
              {copy.clientLabel}
            </label>
            <select
              id="solicitud-client"
              value={clientId}
              onChange={(event) => {
                setClientId(event.target.value)
                setLinkUrl('')
                setLinkToken('')
              }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{copy.clientPlaceholder}</option>
              {sortedClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} ({client.email})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="solicitud-link" className="text-sm font-medium">
              {copy.urlLabel}
            </label>
            <Input
              id="solicitud-link"
              value={linkUrl}
              placeholder={copy.urlPlaceholder}
              readOnly
            />
          </div>

          {linkToken ? (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">{copy.tokenLabel}</span>
              <OnboardingTokenSecret token={linkToken} />
              <p className="text-sm text-muted-foreground">{copy.tokenHint}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={handleGenerateLink}
              disabled={pending || !clientId}
              aria-busy={pending}
            >
              {pending ? copy.creating : copy.createButton}
            </Button>
            <Button type="button" variant="secondary" disabled>
              {copy.sendLinkButton}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{copy.sendLinkHint}</p>
        </div>
      )}
    </section>
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
    if (!window.confirm(copy.deleteConfirm)) return
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
        onClick={handleDelete}
        disabled={pendingAction !== null}
        className="h-8 gap-1 px-2 text-destructive hover:text-destructive"
      >
        <Trash2 className="size-3.5" aria-hidden />
        {pendingAction === 'delete' ? copy.actions.deleting : copy.actions.delete}
      </Button>
    </div>
  )
}

function OnboardingSolicitudList({
  rows,
  onUpdated,
}: {
  rows: OnboardingSolicitudRow[]
  onUpdated: (rows: OnboardingSolicitudRow[]) => void
}) {
  const copy = solicitudes.list
  const [filter, setFilter] = useState<ListFilter>('pending')

  const filteredRows = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter((row) => row.status === 'active')
  }, [filter, rows])

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-sans text-lg font-semibold text-foreground">
            {copy.sectionTitle}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {copy.sectionDescription}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={filter === 'pending' ? 'default' : 'outline'}
            onClick={() => setFilter('pending')}
          >
            {copy.filterPending}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            {copy.filterAll}
          </Button>
        </div>
      </div>

      {filteredRows.length === 0 ? (
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
      ) : (
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
      )}
    </section>
  )
}

export function SolicitudesPageView({
  initialClients,
  initialRows,
}: SolicitudesPageViewProps) {
  const copy = solicitudes.page
  const [rows, setRows] = useState(initialRows)

  return (
    <div className="flex flex-col gap-8">
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

      <AltaAutonomoLinkPanel clients={initialClients} onCreated={setRows} />
      <OnboardingSolicitudList rows={rows} onUpdated={setRows} />
    </div>
  )
}
