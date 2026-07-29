'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { equipo } from '@/content/equipo'
import {
  createGestorAction,
  updateGestorAction,
  type DirectoryUpdateResult,
} from '@/src/modules/directory/application/directory-mutations'
import type { GestorRecord } from '@/src/modules/directory/domain/types'
import type {
  OdooNameSplitMode,
  OdooUserImportOption,
} from '@/src/modules/directory/domain/odoo-user-import'
import { GestorAccessSection } from '@/src/modules/directory/ui/gestor-access-section'
import { GestorDangerZone } from '@/src/modules/directory/ui/gestor-danger-zone'
import { OdooGestorImportPicker } from '@/src/modules/directory/ui/odoo-gestor-import-picker'
import { OdooNameSplitToolbar } from '@/src/modules/directory/ui/odoo-name-split-toolbar'

type GestorImportDraft = {
  firstName: string
  firstSurname: string
  secondSurname?: string
  email: string
  phone?: string
  odooUserId?: string
}

type GestorFormProps = {
  mode: 'create' | 'edit'
  gestor?: GestorRecord
  onSuccess: () => void
  onCancel: () => void
  onDeleted?: () => void
  formInstanceKey?: string
  importDraft?: GestorImportDraft | null
  odooUsers?: OdooUserImportOption[]
  odooImportLoadState?: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'
  selectedOdooUserId?: number | null
  onOdooUserSelect?: (user: OdooUserImportOption | null) => void
  odooNameSplitMode?: OdooNameSplitMode
  onOdooNameSplitModeChange?: (mode: OdooNameSplitMode) => void
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
  importDraft,
  odooUsers = [],
  odooImportLoadState = 'idle',
  selectedOdooUserId = null,
  onOdooUserSelect,
  odooNameSplitMode = 'given-first',
  onOdooNameSplitModeChange,
}: GestorFormProps) {
  const copy = equipo.form
  const isCreate = mode === 'create'
  const action = isCreate ? createGestorAction : updateGestorAction
  const [state, formAction, pending] = useActionState<
    DirectoryUpdateResult | null,
    FormData
  >(action, null)

  const selectedOdooUser = odooUsers.find((user) => user.id === selectedOdooUserId)

  const defaults = isCreate
    ? {
        firstName: importDraft?.firstName ?? '',
        firstSurname: importDraft?.firstSurname ?? '',
        secondSurname: importDraft?.secondSurname ?? '',
        email: importDraft?.email ?? '',
        phone: importDraft?.phone ?? '',
        odooUserId: importDraft?.odooUserId ?? '',
      }
    : {
        firstName: gestor?.firstName ?? '',
        firstSurname: gestor?.firstSurname ?? '',
        secondSurname: gestor?.secondSurname ?? '',
        email: gestor?.email ?? '',
        phone: gestor?.phone ?? '',
        odooUserId: gestor?.odooUserId ?? '',
      }

  const [roleValue, setRoleValue] = useState<string>(gestor?.role ?? 'advisor')
  const [statusValue, setStatusValue] = useState<string>(
    gestor?.status ?? 'invited'
  )

  useEffect(() => {
    setRoleValue(gestor?.role ?? 'advisor')
  }, [gestor?.role])

  useEffect(() => {
    setStatusValue(gestor?.status ?? 'invited')
  }, [gestor?.status])
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

      {isCreate && odooImportLoadState === 'loading' ? (
        <p className="text-sm text-muted-foreground">
          {copy.gestorOdooImport.loading}
        </p>
      ) : null}

      {isCreate && odooImportLoadState === 'unavailable' ? (
        <p className="text-sm text-muted-foreground">
          {copy.gestorOdooImport.unavailable}
        </p>
      ) : null}

      {isCreate && odooImportLoadState === 'error' ? (
        <p className="text-sm text-destructive" role="alert">
          {copy.gestorOdooImport.error}
        </p>
      ) : null}

      {isCreate &&
      odooImportLoadState === 'ready' &&
      onOdooUserSelect &&
      odooUsers.length > 0 ? (
        <OdooGestorImportPicker
          users={odooUsers}
          selectedId={selectedOdooUserId}
          onSelect={onOdooUserSelect}
        />
      ) : null}

      {isCreate && selectedOdooUser && onOdooNameSplitModeChange ? (
        <OdooNameSplitToolbar
          odooLabel={selectedOdooUser.label}
          mode={odooNameSplitMode}
          onModeChange={onOdooNameSplitModeChange}
        />
      ) : null}

      {isCreate && selectedOdooUserId ? (
        <p className="text-xs text-muted-foreground">
          {copy.gestorOdooImport.reviewHint}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="gestor-first-name" className="text-sm font-medium text-foreground">
          {copy.fields.firstName}
        </label>
        <Input
          id="gestor-first-name"
          name="firstName"
          defaultValue={defaults.firstName}
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
          defaultValue={defaults.firstSurname}
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
          defaultValue={defaults.secondSurname}
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
          defaultValue={defaults.email}
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
          defaultValue={defaults.phone}
          autoComplete="tel"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="gestor-odoo" className="text-sm font-medium text-foreground">
          {copy.fields.odooUserId}
        </label>
        <Input
          id="gestor-odoo"
          name="odooUserId"
          inputMode="numeric"
          defaultValue={defaults.odooUserId}
          aria-describedby="gestor-odoo-hint"
        />
        <p id="gestor-odoo-hint" className="text-xs text-muted-foreground">
          {copy.fields.odooUserIdHint}
        </p>
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
          <input type="hidden" name="role" value={roleValue} />
          <Select
            value={roleValue}
            onValueChange={(next) => setRoleValue(next)}
          >
            <SelectTrigger
              aria-label={copy.fields.role}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="advisor">{equipo.roles.advisor}</SelectItem>
              <SelectItem value="admin">{equipo.roles.admin}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {!isCreate ? (
          <div className="flex flex-col gap-2">
            <label htmlFor="gestor-status" className="text-sm font-medium text-foreground">
              {copy.fields.status}
            </label>
            <input type="hidden" name="status" value={statusValue} />
            <Select
              value={statusValue}
              onValueChange={(next) => setStatusValue(next)}
            >
              <SelectTrigger
                aria-label={copy.fields.status}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{equipo.status.active}</SelectItem>
                <SelectItem value="invited">
                  {equipo.status.invited}
                </SelectItem>
              </SelectContent>
            </Select>
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

      {!isCreate && gestor ? <GestorAccessSection gestor={gestor} /> : null}

      {!isCreate && gestor && onDeleted ? (
        <GestorDangerZone gestor={gestor} onDeleted={onDeleted} />
      ) : null}
    </form>
  )
}
