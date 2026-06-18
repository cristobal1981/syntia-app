'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { equipo } from '@/content/equipo'
import {
  createClientAction,
  updateClientAction,
  type DirectoryUpdateResult,
} from '@/src/modules/directory/application/directory-mutations'
import type { ClientRecord } from '@/src/modules/directory/domain/types'
import { ClientDangerZone } from '@/src/modules/directory/ui/client-danger-zone'
import { ClientAccessSection } from '@/src/modules/directory/ui/client-access-section'

type ClientFormProps = {
  mode: 'create' | 'edit'
  client?: ClientRecord
  advisorOptions: Array<{ id: string; name: string }>
  canAssignAdvisor: boolean
  onSuccess: () => void
  onCancel: () => void
  onDeleted?: () => void
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  )
}

export function ClientForm({
  mode,
  client,
  advisorOptions,
  canAssignAdvisor,
  onSuccess,
  onCancel,
  onDeleted,
}: ClientFormProps) {
  const copy = equipo.form
  const isCreate = mode === 'create'
  const action = isCreate ? createClientAction : updateClientAction
  const [state, formAction, pending] = useActionState<
    DirectoryUpdateResult | null,
    FormData
  >(action, null)
  const onSuccessRef = useRef(onSuccess)
  const handledStateRef = useRef<DirectoryUpdateResult | null>(null)

  useEffect(() => {
    onSuccessRef.current = onSuccess
  })

  useEffect(() => {
    if (!state) return
    if (handledStateRef.current === state) return
    handledStateRef.current = state

    if (state.ok) {
      toast.success(
        isCreate
          ? state.inviteSent === false
            ? copy.successCreateClientNoInvite
            : copy.successCreateClient
          : copy.successClient
      )
      onSuccessRef.current()
      return
    }
    if (state.error === 'forbidden') {
      toast.error(copy.errors.forbidden)
      return
    }
    if (state.error !== 'validation') {
      toast.error(state.message ?? copy.errors.unknown)
    }
  }, [state, copy, isCreate])

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {!isCreate && client ? (
        <input type="hidden" name="id" value={client.id} />
      ) : null}
      {!canAssignAdvisor && !isCreate && client?.advisorId ? (
        <input type="hidden" name="advisorId" value={client.advisorId} />
      ) : null}

      {isCreate ? (
        <p className="text-sm text-muted-foreground">{copy.inviteHint}</p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="client-first-name" className="text-sm font-medium text-foreground">
          {copy.fields.firstName}
        </label>
        <Input
          id="client-first-name"
          name="firstName"
          defaultValue={client?.firstName ?? ''}
          autoComplete="given-name"
          aria-invalid={Boolean(
            state && !state.ok && state.fieldErrors?.firstName
          )}
        />
        <FieldError
          message={
            state && !state.ok ? state.fieldErrors?.firstName : undefined
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="client-first-surname"
          className="text-sm font-medium text-foreground"
        >
          {copy.fields.firstSurname}
        </label>
        <Input
          id="client-first-surname"
          name="firstSurname"
          defaultValue={client?.firstSurname ?? ''}
          autoComplete="family-name"
          aria-invalid={Boolean(
            state && !state.ok && state.fieldErrors?.firstSurname
          )}
        />
        <FieldError
          message={
            state && !state.ok ? state.fieldErrors?.firstSurname : undefined
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="client-second-surname"
          className="text-sm font-medium text-foreground"
        >
          {copy.fields.secondSurname}
        </label>
        <Input
          id="client-second-surname"
          name="secondSurname"
          defaultValue={client?.secondSurname ?? ''}
          autoComplete="additional-name"
          aria-invalid={Boolean(
            state && !state.ok && state.fieldErrors?.secondSurname
          )}
        />
        <FieldError
          message={
            state && !state.ok ? state.fieldErrors?.secondSurname : undefined
          }
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="client-email" className="text-sm font-medium text-foreground">
          {copy.fields.email}
        </label>
        <Input
          id="client-email"
          name="email"
          type="email"
          defaultValue={client?.email ?? ''}
          autoComplete="email"
          aria-invalid={Boolean(state && !state.ok && state.fieldErrors?.email)}
        />
        <FieldError
          message={state && !state.ok ? state.fieldErrors?.email : undefined}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="client-phone" className="text-sm font-medium text-foreground">
          {copy.fields.phone}
        </label>
        <Input
          id="client-phone"
          name="phone"
          type="tel"
          defaultValue={client?.phone ?? ''}
          autoComplete="tel"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="client-company" className="text-sm font-medium text-foreground">
          {copy.fields.company}
        </label>
        <Input
          id="client-company"
          name="companyName"
          defaultValue={client?.companyName ?? ''}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="client-odoo"
          className="text-sm font-medium text-foreground"
        >
          {copy.fields.odooPartnerId}
        </label>
        <Input
          id="client-odoo"
          name="odooPartnerId"
          inputMode="numeric"
          defaultValue={client?.odooPartnerId ?? ''}
          aria-describedby="client-odoo-hint"
          aria-invalid={Boolean(
            state && !state.ok && state.fieldErrors?.odooPartnerId
          )}
        />
        <p id="client-odoo-hint" className="text-xs text-muted-foreground">
          {copy.fields.odooPartnerIdHint}
        </p>
        <FieldError
          message={
            state && !state.ok ? state.fieldErrors?.odooPartnerId : undefined
          }
        />
      </div>

      {canAssignAdvisor ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="client-advisor"
            className="text-sm font-medium text-foreground"
          >
            {copy.fields.advisor}
          </label>
          <select
            id="client-advisor"
            name="advisorId"
            defaultValue={client?.advisorId ?? ''}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{copy.fields.unassigned}</option>
            {advisorOptions.map((advisor) => (
              <option key={advisor.id} value={advisor.id}>
                {advisor.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!isCreate ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="client-status" className="text-sm font-medium text-foreground">
            {copy.fields.status}
          </label>
          <select
            id="client-status"
            name="status"
            defaultValue={client?.status ?? 'invited'}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="active">{equipo.status.active}</option>
            <option value="invited">{equipo.status.invited}</option>
          </select>
        </div>
      ) : null}

      <div className="mt-2 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          {copy.cancel}
        </Button>
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending
            ? isCreate
              ? copy.creating
              : copy.saving
            : isCreate
              ? copy.create
              : copy.save}
        </Button>
      </div>

      {!isCreate && client && onDeleted ? (
        <>
          <ClientAccessSection client={client} />
          <ClientDangerZone client={client} onDeleted={onDeleted} />
        </>
      ) : null}
    </form>
  )
}
