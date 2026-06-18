'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { equipo } from '@/content/equipo'
import {
  createGestorAction,
  updateGestorAction,
  type DirectoryUpdateResult,
} from '@/src/modules/directory/application/directory-mutations'
import type { GestorRecord } from '@/src/modules/directory/domain/types'
import { GestorDangerZone } from '@/src/modules/directory/ui/gestor-danger-zone'

type GestorFormProps = {
  mode: 'create' | 'edit'
  gestor?: GestorRecord
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

export function GestorForm({
  mode,
  gestor,
  onSuccess,
  onCancel,
  onDeleted,
}: GestorFormProps) {
  const copy = equipo.form
  const isCreate = mode === 'create'
  const action = isCreate ? createGestorAction : updateGestorAction
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
            ? copy.successCreateGestorNoInvite
            : copy.successCreateGestor
          : copy.successGestor
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
      {!isCreate && gestor ? (
        <input type="hidden" name="id" value={gestor.id} />
      ) : null}

      {isCreate ? (
        <p className="text-sm text-muted-foreground">{copy.inviteHint}</p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="gestor-first-name" className="text-sm font-medium text-foreground">
          {copy.fields.firstName}
        </label>
        <Input
          id="gestor-first-name"
          name="firstName"
          defaultValue={gestor?.firstName ?? ''}
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
          htmlFor="gestor-first-surname"
          className="text-sm font-medium text-foreground"
        >
          {copy.fields.firstSurname}
        </label>
        <Input
          id="gestor-first-surname"
          name="firstSurname"
          defaultValue={gestor?.firstSurname ?? ''}
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
          htmlFor="gestor-second-surname"
          className="text-sm font-medium text-foreground"
        >
          {copy.fields.secondSurname}
        </label>
        <Input
          id="gestor-second-surname"
          name="secondSurname"
          defaultValue={gestor?.secondSurname ?? ''}
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
        <label htmlFor="gestor-email" className="text-sm font-medium text-foreground">
          {copy.fields.email}
        </label>
        <Input
          id="gestor-email"
          name="email"
          type="email"
          defaultValue={gestor?.email ?? ''}
          autoComplete="email"
          aria-invalid={Boolean(state && !state.ok && state.fieldErrors?.email)}
        />
        <FieldError
          message={state && !state.ok ? state.fieldErrors?.email : undefined}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="gestor-phone" className="text-sm font-medium text-foreground">
          {copy.fields.phone}
        </label>
        <Input
          id="gestor-phone"
          name="phone"
          type="tel"
          defaultValue={gestor?.phone ?? ''}
          autoComplete="tel"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="gestor-company" className="text-sm font-medium text-foreground">
          {copy.fields.company}
        </label>
        <Input
          id="gestor-company"
          name="companyName"
          defaultValue={gestor?.companyName ?? ''}
        />
      </div>

      <div className={isCreate ? 'flex flex-col gap-2' : 'grid gap-4 sm:grid-cols-2'}>
        <div className="flex flex-col gap-2">
          <label htmlFor="gestor-role" className="text-sm font-medium text-foreground">
            {copy.fields.role}
          </label>
          <select
            id="gestor-role"
            name="role"
            defaultValue={gestor?.role ?? 'advisor'}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="advisor">{equipo.roles.advisor}</option>
            <option value="admin">{equipo.roles.admin}</option>
          </select>
        </div>

        {!isCreate ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="gestor-status" className="text-sm font-medium text-foreground">
              {copy.fields.status}
            </label>
            <select
              id="gestor-status"
              name="status"
              defaultValue={gestor?.status ?? 'invited'}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="active">{equipo.status.active}</option>
              <option value="invited">{equipo.status.invited}</option>
            </select>
          </div>
        ) : null}
      </div>

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
              ? copy.createGestorButton
              : copy.save}
        </Button>
      </div>

      {!isCreate && gestor && onDeleted ? (
        <GestorDangerZone gestor={gestor} onDeleted={onDeleted} />
      ) : null}
    </form>
  )
}
