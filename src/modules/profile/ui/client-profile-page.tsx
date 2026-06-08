'use client'

import {
  useActionState,
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'

import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { profile } from '@/content/profile'
import { cn } from '@/lib/utils'
import { maskIban } from '@/lib/profile/validate-profile-change'
import { submitProfileChangeRequestAction } from '@/src/modules/profile/application/submit-profile-change-request'
import type { ClientProfile, ProfileChangeFormState } from '@/src/modules/profile/domain/types'
import { ProfileSuccessDialog } from '@/src/modules/profile/ui/profile-success-dialog'

type ClientProfilePageProps = {
  initialProfile: ClientProfile
}

const PROFILE_FORM_ID = 'profile-change-form'

type PostalLookupResponse = {
  places?: Array<{
    'place name'?: string
    state?: string
  }>
}

async function lookupPostalCode(postalCode: string) {
  if (!/^[0-9]{5}$/.test(postalCode)) return null

  try {
    const response = await fetch(`https://api.zippopotam.us/es/${postalCode}`)
    if (!response.ok) return null

    const data = (await response.json()) as PostalLookupResponse
    const place = data.places?.[0]
    if (!place) return null

    return {
      city: place['place name'] ?? '',
      province: place.state ?? '',
    }
  } catch {
    return null
  }
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null

  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  )
}

function ProfileField({
  id,
  label,
  name,
  value,
  type = 'text',
  readOnly,
  editMode,
  error,
  autoComplete,
  className,
}: {
  id: string
  label: string
  name: string
  value: string
  type?: string
  readOnly: boolean
  editMode: boolean
  error?: string
  autoComplete?: string
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>

      {editMode ? (
        <p className="text-xs text-muted-foreground">
          {profile.labels.currentValue}: {value || '—'}
        </p>
      ) : null}

      <Input
        id={id}
        name={name}
        type={type}
        defaultValue={value}
        readOnly={readOnly}
        disabled={readOnly}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className="h-10 disabled:cursor-default disabled:opacity-100"
      />

      <FieldError message={error} />
    </div>
  )
}

function AddressField({
  id,
  label,
  name,
  value,
  readOnly,
  error,
  className,
  onBlur,
  onChange,
  controlled = false,
}: {
  id: string
  label: string
  name: string
  value: string
  readOnly: boolean
  error?: string
  className?: string
  onBlur?: (value: string) => void
  onChange?: (value: string) => void
  controlled?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={id}
        name={name}
        {...(controlled
          ? { value, onChange: (event) => onChange?.(event.target.value) }
          : { defaultValue: value })}
        readOnly={readOnly}
        disabled={readOnly}
        onBlur={onBlur ? (event) => onBlur(event.target.value.trim()) : undefined}
        aria-invalid={Boolean(error)}
        className="h-10 disabled:cursor-default disabled:opacity-100"
      />
      <FieldError message={error} />
    </div>
  )
}

export function ClientProfilePage({ initialProfile }: ClientProfilePageProps) {
  const [editMode, setEditMode] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formKey, setFormKey] = useState(0)
  const [submitReady, setSubmitReady] = useState(false)
  const [address, setAddress] = useState(initialProfile.address)
  const wasPendingRef = useRef(false)
  const submitGenerationRef = useRef(0)
  const activeSubmitGenerationRef = useRef<number | null>(null)
  const lastHandledGenerationRef = useRef(0)

  const [state, formAction, pending] = useActionState(
    submitProfileChangeRequestAction,
    null
  )

  const clearFeedback = () => {
    toast.dismiss()
    setShowSuccess(false)
    setFieldErrors({})
  }

  const invalidateInFlightSubmit = () => {
    submitGenerationRef.current += 1
    activeSubmitGenerationRef.current = null
    wasPendingRef.current = false
    clearFeedback()
  }

  const markFormSubmitted = useCallback(() => {
    submitGenerationRef.current += 1
    activeSubmitGenerationRef.current = submitGenerationRef.current
  }, [])

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (!editMode) {
      event.preventDefault()
      return
    }

    markFormSubmitted()
  }

  const handleSubmitResult = (result: ProfileChangeFormState) => {
    if (result.ok) {
      setShowSuccess(true)
      setEditMode(false)
      setSubmitReady(false)
      toast.dismiss()
      setFieldErrors({})
      setAddress(initialProfile.address)
      setFormKey((current) => current + 1)
      return
    }

    if (result.error === 'validation') {
      const formMessage = result.fieldErrors?._form
      if (formMessage) {
        toast.error(formMessage)
      }
      setFieldErrors(
        Object.fromEntries(
          Object.entries(result.fieldErrors ?? {}).filter(([key]) => key !== '_form')
        )
      )
      return
    }

    const errorKey =
      result.error === 'forbidden'
        ? 'forbidden'
        : result.error === 'unauthorized'
          ? 'unauthorized'
          : 'unknown'
    toast.error(profile.errors[errorKey])
    setFieldErrors({})
  }

  useEffect(() => {
    const justFinished = wasPendingRef.current && !pending
    const submitId = activeSubmitGenerationRef.current
    const isTrackedSubmit =
      submitId !== null &&
      submitId === submitGenerationRef.current &&
      submitId > lastHandledGenerationRef.current

    if (justFinished && state && isTrackedSubmit) {
      lastHandledGenerationRef.current = submitId
      handleSubmitResult(state)
      activeSubmitGenerationRef.current = null
    }

    wasPendingRef.current = pending
  }, [pending, state])

  const readOnly = !editMode
  const displayIban = maskIban(initialProfile.iban)

  const handlePostalBlur = async (postalCode: string) => {
    if (!editMode) return

    const lookup = await lookupPostalCode(postalCode)
    if (!lookup) return

    setAddress((current) => ({
      ...current,
      postalCode,
      city: current.city || lookup.city,
      province: current.province || lookup.province,
    }))
  }

  const resetEditMode = () => {
    invalidateInFlightSubmit()
    setEditMode(false)
    setSubmitReady(false)
    setAddress(initialProfile.address)
    setFormKey((current) => current + 1)
  }

  const enterEditMode = () => {
    invalidateInFlightSubmit()
    setSubmitReady(false)
    // Defer swap so the same click cannot land on the submit button (same slot).
    window.setTimeout(() => {
      setEditMode(true)
      window.requestAnimationFrame(() => setSubmitReady(true))
    }, 0)
  }

  const phoneValue = initialProfile.phone
  const phoneFieldValue = readOnly && !phoneValue ? profile.emptyPhone : phoneValue

  return (
    <div className="flex w-full flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {profile.pageTitle}
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground md:text-base">
          {profile.pageDescription}
        </p>
      </header>

      <ProfileSuccessDialog open={showSuccess} onOpenChange={setShowSuccess} />

      <div className="flex flex-col gap-8">
      <form
        key={formKey}
        id={PROFILE_FORM_ID}
        action={formAction}
        onSubmit={handleFormSubmit}
        className="flex flex-col gap-6 lg:gap-8"
        noValidate
      >
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

        <div className="grid gap-8 lg:grid-cols-2 lg:items-start xl:gap-10">
          <section className="flex flex-col gap-4" aria-labelledby="profile-personal">
            <h2 id="profile-personal" className="font-sans text-lg font-semibold text-foreground">
              {profile.sections.personal}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <ProfileField
                id="name"
                label={profile.labels.name}
                name="name"
                value={initialProfile.name}
                readOnly={readOnly}
                editMode={editMode}
                error={fieldErrors.name}
                autoComplete="name"
              />

              <ProfileField
                id="phone"
                label={profile.labels.phone}
                name="phone"
                type="tel"
                value={phoneFieldValue}
                readOnly={readOnly}
                editMode={editMode}
                error={fieldErrors.phone}
                autoComplete="tel"
              />

              <ProfileField
                id="email"
                label={profile.labels.email}
                name="email"
                type="email"
                value={initialProfile.email}
                readOnly={readOnly}
                editMode={editMode}
                error={fieldErrors.email}
                autoComplete="email"
                className="sm:col-span-2"
              />

              <ProfileField
                id="taxId"
                label={profile.labels.taxId}
                name="taxId"
                value={initialProfile.taxId}
                readOnly={readOnly}
                editMode={editMode}
                error={fieldErrors.taxId}
              />

              {editMode ? (
                <ProfileField
                  id="iban"
                  label={profile.labels.iban}
                  name="iban"
                  value={initialProfile.iban}
                  readOnly={readOnly}
                  editMode={editMode}
                  error={fieldErrors.iban}
                />
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="iban-display" className="text-sm font-medium text-foreground">
                    {profile.labels.iban}
                  </label>
                  <Input
                    id="iban-display"
                    name="iban-display"
                    value={displayIban}
                    readOnly
                    disabled
                    className="h-10 disabled:cursor-default disabled:opacity-100"
                  />
                </div>
              )}
            </div>
          </section>

          <section className="flex flex-col gap-4" aria-labelledby="profile-address">
            <h2 id="profile-address" className="font-sans text-lg font-semibold text-foreground">
              {profile.sections.address}
            </h2>

            {editMode ? (
              <p className="text-xs text-muted-foreground">
                {profile.labels.currentValue}: {initialProfile.address.line1 || '—'}
                {initialProfile.address.line2 ? `, ${initialProfile.address.line2}` : ''}
                {initialProfile.address.postalCode
                  ? ` · ${initialProfile.address.postalCode} ${initialProfile.address.city}`
                  : ''}
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <AddressField
                id="addressLine1"
                label={profile.labels.addressLine1}
                name="addressLine1"
                value={address.line1}
                readOnly={readOnly}
                error={fieldErrors.addressLine1}
                className="sm:col-span-2"
                controlled
                onChange={(line1) => setAddress((current) => ({ ...current, line1 }))}
              />

              <AddressField
                id="addressLine2"
                label={profile.labels.addressLine2}
                name="addressLine2"
                value={address.line2}
                readOnly={readOnly}
                className="sm:col-span-2"
                controlled
                onChange={(line2) => setAddress((current) => ({ ...current, line2 }))}
              />

              <AddressField
                id="postalCode"
                label={profile.labels.postalCode}
                name="postalCode"
                value={address.postalCode}
                readOnly={readOnly}
                error={fieldErrors.postalCode}
                onBlur={(postalCode) => void handlePostalBlur(postalCode)}
                controlled
                onChange={(postalCode) => setAddress((current) => ({ ...current, postalCode }))}
              />

              <AddressField
                id="city"
                label={profile.labels.city}
                name="city"
                value={address.city}
                readOnly={readOnly}
                error={fieldErrors.city}
                controlled
                onChange={(city) => setAddress((current) => ({ ...current, city }))}
              />

              <AddressField
                id="province"
                label={profile.labels.province}
                name="province"
                value={address.province}
                readOnly={readOnly}
                error={fieldErrors.province}
                controlled
                onChange={(province) => setAddress((current) => ({ ...current, province }))}
              />

              <AddressField
                id="country"
                label={profile.labels.country}
                name="country"
                value={address.country}
                readOnly={readOnly}
                error={fieldErrors.country}
                controlled
                onChange={(country) => setAddress((current) => ({ ...current, country }))}
              />
            </div>
          </section>
        </div>

        {editMode ? (
          <p className="text-sm text-muted-foreground">{profile.requestModeHint}</p>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-3">
        {!editMode ? (
          <Button type="button" onClick={enterEditMode}>
            {profile.actions.requestChange}
          </Button>
        ) : (
          <>
            <Button type="submit" form={PROFILE_FORM_ID} disabled={pending || !submitReady}>
              {pending ? 'Enviando…' : profile.actions.submitRequest}
            </Button>
            <Button type="button" variant="outline" onClick={resetEditMode} disabled={pending}>
              {profile.actions.cancel}
            </Button>
          </>
        )}
      </div>
      </div>
    </div>
  )
}
