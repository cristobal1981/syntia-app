'use client'

import { useActionState, useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
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
  createClientAction,
  updateClientAction,
  type DirectoryUpdateResult,
} from '@/src/modules/directory/application/directory-mutations'
import { validateClientForm } from '@/src/modules/directory/application/validate-directory'
import { parseClientKind } from '@/src/modules/directory/domain/client-kind'
import type {
  OdooNameSplitMode,
  OdooPartnerImportOption,
} from '@/src/modules/directory/domain/odoo-partner-import'
import { resolveOdooPartnerEmails } from '@/src/modules/directory/domain/odoo-partner-import'
import type { ClientKind, ClientRecord } from '@/src/modules/directory/domain/types'
import { ClientAccessSection } from '@/src/modules/directory/ui/client-access-section'
import { ClientDangerZone } from '@/src/modules/directory/ui/client-danger-zone'
import { ClientKindSelector } from '@/src/modules/directory/ui/client-kind-selector'
import { OdooNameSplitToolbar } from '@/src/modules/directory/ui/odoo-name-split-toolbar'
import { OdooPartnerImportPicker } from '@/src/modules/directory/ui/odoo-partner-import-picker'
import { RequiredFieldLabel } from '@/src/modules/directory/ui/required-field-label'

function parseClientFormData(formData: FormData) {
  return {
    clientKind: parseClientKind(String(formData.get('clientKind') ?? '')),
    firstName: String(formData.get('firstName') ?? '').trim(),
    firstSurname: String(formData.get('firstSurname') ?? '').trim(),
    secondSurname:
      String(formData.get('secondSurname') ?? '').trim() || undefined,
    email: String(formData.get('email') ?? '').trim(),
    companyName: String(formData.get('companyName') ?? '').trim() || undefined,
    odooPartnerId:
      String(formData.get('odooPartnerId') ?? '').trim() || undefined,
    driveFolderId:
      String(formData.get('driveFolderId') ?? '').trim() || undefined,
  }
}

export type ClientImportDraft = {
  clientKind?: ClientKind
  firstName?: string
  firstSurname?: string
  secondSurname?: string
  email?: string
  phone?: string
  companyName?: string
  corporateEmail?: string
  odooPartnerId?: string
  driveFolderId?: string
}

type ClientFormProps = {
  mode: 'create' | 'edit'
  client?: ClientRecord
  clientKind: ClientKind
  onClientKindChange: (kind: ClientKind) => void
  advisorOptions: Array<{ id: string; name: string }>
  canAssignAdvisor: boolean
  onSuccess: () => void
  onCancel: () => void
  onDeleted?: () => void
  formInstanceKey?: string
  importDraft?: ClientImportDraft | null
  odooPartners?: OdooPartnerImportOption[]
  odooImportLoadState?: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'
  selectedOdooPartnerId?: number | null
  onOdooPartnerSelect?: (partner: OdooPartnerImportOption | null) => void
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

export function ClientForm({
  mode,
  client,
  clientKind,
  onClientKindChange,
  advisorOptions,
  canAssignAdvisor,
  onSuccess,
  onCancel,
  onDeleted,
  formInstanceKey,
  importDraft,
  odooPartners = [],
  odooImportLoadState = 'idle',
  selectedOdooPartnerId = null,
  onOdooPartnerSelect,
  odooNameSplitMode = 'given-first',
  onOdooNameSplitModeChange,
}: ClientFormProps) {
  const copy = equipo.form
  const isCreate = mode === 'create'
  const isCompany = clientKind === 'company'
  const selectedOdooPartner = odooPartners.find(
    (partner) => partner.id === selectedOdooPartnerId
  )
  const selectedOdooEmails = selectedOdooPartner
    ? resolveOdooPartnerEmails(selectedOdooPartner)
    : null
  const action = isCreate ? createClientAction : updateClientAction
  const [localFieldErrors, setLocalFieldErrors] = useState<Record<string, string>>(
    {}
  )
  const [state, formAction, pending] = useActionState<
    DirectoryUpdateResult | null,
    FormData
  >(action, null)
  const [, startTransition] = useTransition()
  const onSuccessRef = useRef(onSuccess)
  const handledStateRef = useRef<DirectoryUpdateResult | null>(null)

  const defaults = isCreate
    ? {
        firstName: importDraft?.firstName ?? '',
        firstSurname: importDraft?.firstSurname ?? '',
        secondSurname: importDraft?.secondSurname ?? '',
        email: importDraft?.email ?? '',
        phone: importDraft?.phone ?? '',
        companyName: importDraft?.companyName ?? '',
        odooPartnerId: importDraft?.odooPartnerId ?? '',
        driveFolderId: importDraft?.driveFolderId ?? '',
        advisorId: '',
      }
    : {
        firstName: client?.firstName ?? '',
        firstSurname: client?.firstSurname ?? '',
        secondSurname: client?.secondSurname ?? '',
        email: client?.email ?? '',
        phone: client?.phone ?? '',
        companyName: client?.companyName ?? '',
        odooPartnerId: client?.odooPartnerId ?? '',
        driveFolderId: client?.driveFolderId ?? '',
        advisorId: client?.advisorId ?? '',
      }

  const [advisorIdValue, setAdvisorIdValue] = useState(defaults.advisorId)
  const [statusValue, setStatusValue] = useState<
    'active' | 'invited'
  >(client?.status ?? 'invited')

  useEffect(() => {
    setAdvisorIdValue(defaults.advisorId)
  }, [defaults.advisorId])

  useEffect(() => {
    setStatusValue((client?.status ?? 'invited') as 'active' | 'invited')
  }, [client?.status])

  const corporateEmailHint =
    isCompany &&
    selectedOdooEmails?.contactEmail &&
    selectedOdooEmails?.corporateEmail &&
    selectedOdooEmails.corporateEmail.toLowerCase() !==
      selectedOdooEmails.contactEmail.toLowerCase()
      ? copy.odooImport.corporateEmailHint.replace(
          '{email}',
          selectedOdooEmails.corporateEmail
        )
      : null

  function getFieldError(field: string): string | undefined {
    if (localFieldErrors[field]) return localFieldErrors[field]
    if (state && !state.ok && state.fieldErrors?.[field]) {
      return state.fieldErrors[field]
    }
    return undefined
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const fieldErrors = validateClientForm(parseClientFormData(formData))

    if (Object.keys(fieldErrors).length > 0) {
      setLocalFieldErrors(fieldErrors)
      toast.error(copy.errors.validation)
      return
    }

    setLocalFieldErrors({})
    startTransition(() => {
      formAction(formData)
    })
  }

  useEffect(() => {
    onSuccessRef.current = onSuccess
  })

  useEffect(() => {
    if (!state) return
    if (handledStateRef.current === state) return
    handledStateRef.current = state

    if (state.ok) {
      setLocalFieldErrors({})
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
      return
    }
    if (state.fieldErrors) {
      setLocalFieldErrors(state.fieldErrors)
    }
  }, [state, copy, isCreate])

  const formKey =
    formInstanceKey ??
    (isCreate ? 'client-create-empty' : `client-edit-${client?.id}`)

  return (
    <form
      key={formKey}
      onSubmit={handleSubmit}
      className="flex flex-col gap-4"
      noValidate
    >
      {!isCreate && client ? (
        <input type="hidden" name="id" value={client.id} />
      ) : null}
      <input type="hidden" name="clientKind" value={clientKind} />
      {!canAssignAdvisor && !isCreate && client?.advisorId ? (
        <input type="hidden" name="advisorId" value={client.advisorId} />
      ) : null}

      {isCreate ? (
        <p className="text-sm text-muted-foreground">{copy.inviteHint}</p>
      ) : null}

      <ClientKindSelector value={clientKind} onChange={onClientKindChange} />

      {isCreate && odooImportLoadState === 'loading' ? (
        <p className="text-sm text-muted-foreground">{copy.odooImport.loading}</p>
      ) : null}

      {isCreate && odooImportLoadState === 'unavailable' ? (
        <p className="text-sm text-muted-foreground">
          {copy.odooImport.unavailable}
        </p>
      ) : null}

      {isCreate && odooImportLoadState === 'error' ? (
        <p className="text-sm text-destructive" role="alert">
          {copy.odooImport.error}
        </p>
      ) : null}

      {isCreate &&
      odooImportLoadState === 'ready' &&
      onOdooPartnerSelect &&
      odooPartners.length > 0 ? (
        <OdooPartnerImportPicker
          partners={odooPartners}
          selectedId={selectedOdooPartnerId}
          onSelect={onOdooPartnerSelect}
        />
      ) : null}

      {isCreate &&
      !isCompany &&
      selectedOdooPartner &&
      onOdooNameSplitModeChange ? (
        <OdooNameSplitToolbar
          odooLabel={selectedOdooPartner.label}
          mode={odooNameSplitMode}
          onModeChange={onOdooNameSplitModeChange}
        />
      ) : null}

      {isCreate && selectedOdooPartnerId ? (
        <p className="text-xs text-muted-foreground">{copy.odooImport.reviewHint}</p>
      ) : null}

      {isCompany ? (
        <div className="flex flex-col gap-2">
          <RequiredFieldLabel htmlFor="client-company-legal">
            {copy.fields.companyLegalName}
          </RequiredFieldLabel>
          <Input
            id="client-company-legal"
            name="companyName"
            defaultValue={defaults.companyName}
            required
            aria-required="true"
            aria-invalid={Boolean(getFieldError('companyName'))}
          />
          <FieldError message={getFieldError('companyName')} />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <RequiredFieldLabel htmlFor="client-first-name">
              {copy.fields.firstName}
            </RequiredFieldLabel>
            <Input
              id="client-first-name"
              name="firstName"
              defaultValue={defaults.firstName}
              autoComplete="given-name"
              required
              aria-required="true"
              aria-invalid={Boolean(getFieldError('firstName'))}
            />
            <FieldError message={getFieldError('firstName')} />
          </div>

          <div className="flex flex-col gap-2">
            <RequiredFieldLabel htmlFor="client-first-surname">
              {copy.fields.firstSurname}
            </RequiredFieldLabel>
            <Input
              id="client-first-surname"
              name="firstSurname"
              defaultValue={defaults.firstSurname}
              autoComplete="family-name"
              required
              aria-required="true"
              aria-invalid={Boolean(getFieldError('firstSurname'))}
            />
            <FieldError message={getFieldError('firstSurname')} />
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
              defaultValue={defaults.secondSurname}
              autoComplete="additional-name"
              aria-invalid={Boolean(getFieldError('secondSurname'))}
            />
            <FieldError message={getFieldError('secondSurname')} />
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <RequiredFieldLabel htmlFor="client-email">
          {isCompany ? copy.fields.contactEmail : copy.fields.email}
        </RequiredFieldLabel>
        <Input
          id="client-email"
          name="email"
          type="email"
          defaultValue={defaults.email}
          autoComplete="email"
          required
          aria-required="true"
          aria-describedby={isCompany ? 'client-email-hint' : undefined}
          aria-invalid={Boolean(getFieldError('email'))}
        />
        {isCompany ? (
          <p id="client-email-hint" className="text-xs text-muted-foreground">
            {copy.fields.contactEmailHint}
          </p>
        ) : null}
        {corporateEmailHint ? (
          <p className="text-xs text-muted-foreground">{corporateEmailHint}</p>
        ) : null}
        <FieldError message={getFieldError('email')} />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="client-phone" className="text-sm font-medium text-foreground">
          {copy.fields.phone}
        </label>
        <Input
          id="client-phone"
          name="phone"
          type="tel"
          defaultValue={defaults.phone}
          autoComplete="tel"
        />
      </div>

      {!isCompany ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="client-company"
            className="text-sm font-medium text-foreground"
          >
            {copy.fields.companyCommercialName}
          </label>
          <Input
            id="client-company"
            name="companyName"
            defaultValue={defaults.companyName}
            aria-describedby="client-company-hint"
          />
          <p id="client-company-hint" className="text-xs text-muted-foreground">
            {copy.fields.companyCommercialNameHint}
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="client-odoo" className="text-sm font-medium text-foreground">
          {copy.fields.odooPartnerId}
        </label>
        <Input
          id="client-odoo"
          name="odooPartnerId"
          inputMode="numeric"
          defaultValue={defaults.odooPartnerId}
          aria-describedby="client-odoo-hint"
          aria-invalid={Boolean(getFieldError('odooPartnerId'))}
        />
        <p id="client-odoo-hint" className="text-xs text-muted-foreground">
          {copy.fields.odooPartnerIdHint}
        </p>
        <FieldError message={getFieldError('odooPartnerId')} />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="client-drive"
          className="text-sm font-medium text-foreground"
        >
          {copy.fields.driveFolderId}
        </label>
        <Input
          id="client-drive"
          name="driveFolderId"
          defaultValue={defaults.driveFolderId}
          aria-describedby="client-drive-hint"
          aria-invalid={Boolean(getFieldError('driveFolderId'))}
        />
        <p id="client-drive-hint" className="text-xs text-muted-foreground">
          {copy.fields.driveFolderIdHint}
        </p>
        <FieldError message={getFieldError('driveFolderId')} />
      </div>

      {canAssignAdvisor ? (
        <div className="flex flex-col gap-2">
          <label
            htmlFor="client-advisor"
            className="text-sm font-medium text-foreground"
          >
            {copy.fields.advisor}
          </label>
          <input type="hidden" name="advisorId" value={advisorIdValue} />
          <Select
            value={advisorIdValue}
            onValueChange={(next) => setAdvisorIdValue(next)}
          >
            <SelectTrigger aria-label={copy.fields.advisor} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <SelectValue placeholder={copy.fields.unassigned} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{copy.fields.unassigned}</SelectItem>
              {advisorOptions.map((advisor) => (
                <SelectItem key={advisor.id} value={advisor.id}>
                  {advisor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {!isCreate ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="client-status" className="text-sm font-medium text-foreground">
            {copy.fields.status}
          </label>
          <input type="hidden" name="status" value={statusValue} />
          <Select
            value={statusValue}
            onValueChange={(next) =>
              setStatusValue(next as 'active' | 'invited')
            }
          >
            <SelectTrigger aria-label={copy.fields.status} className="h-9 rounded-md border border-input bg-background px-3 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{equipo.status.active}</SelectItem>
              <SelectItem value="invited">{equipo.status.invited}</SelectItem>
            </SelectContent>
          </Select>
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

      {!isCreate && client ? <ClientAccessSection client={client} /> : null}

      {!isCreate && client && onDeleted ? (
        <ClientDangerZone client={client} onDeleted={onDeleted} />
      ) : null}
    </form>
  )
}
