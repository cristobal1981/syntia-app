'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { profile } from '@/content/profile'
import { cn } from '@/lib/utils'
import type {
  ClientProfile,
  ProfileChangeApiResponse,
  ProfileChangeErrorCode,
} from '@/src/modules/profile/domain/types'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'
import { PortalSideDrawer } from '@/src/modules/portal/ui/portal-side-drawer'

const PROFILE_CHANGE_FORM_ID = 'profile-change-drawer-form'

type ProfileChangeDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialProfile: ClientProfile
}

type PostalLookupResponse = {
  places?: Array<{
    'place name'?: string
    state?: string
  }>
}

const PROFILE_CHANGE_ERROR_KEYS = [
  'unauthorized',
  'forbidden',
  'not_linked',
  'odoo_unavailable',
  'create_failed',
  'unknown',
] as const satisfies readonly ProfileChangeErrorCode[]

function mapProfileChangeError(error: ProfileChangeErrorCode): string {
  if (error === 'validation') {
    return profile.errors.unknown
  }
  if ((PROFILE_CHANGE_ERROR_KEYS as readonly string[]).includes(error)) {
    return profile.errors[error as (typeof PROFILE_CHANGE_ERROR_KEYS)[number]]
  }
  return profile.errors.unknown
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

function DrawerField({
  id,
  label,
  name,
  value,
  type = 'text',
  error,
  autoComplete,
  className,
  onBlur,
  onChange,
}: {
  id: string
  label: string
  name: string
  value: string
  type?: string
  error?: string
  autoComplete?: string
  className?: string
  onBlur?: (value: string) => void
  onChange: (value: string) => void
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur ? (event) => onBlur(event.target.value.trim()) : undefined}
        className="h-10"
      />
      <FieldError message={error} />
    </div>
  )
}

export function ProfileChangeDrawer({
  open,
  onOpenChange,
  initialProfile,
}: ProfileChangeDrawerProps) {
  const router = useRouter()
  const [formValues, setFormValues] = useState({
    name: initialProfile.name,
    email: initialProfile.email,
    phone: initialProfile.phone,
    taxId: initialProfile.taxId,
    iban: initialProfile.iban,
    address: { ...initialProfile.address },
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const resetForm = useCallback(() => {
    setFormValues({
      name: initialProfile.name,
      email: initialProfile.email,
      phone: initialProfile.phone,
      taxId: initialProfile.taxId,
      iban: initialProfile.iban,
      address: { ...initialProfile.address },
    })
    setFieldErrors({})
  }, [initialProfile])

  useEffect(() => {
    if (!open) {
      resetForm()
    }
  }, [open, resetForm])

  const hasUnsavedChanges =
    formValues.name !== initialProfile.name ||
    formValues.email !== initialProfile.email ||
    formValues.phone !== initialProfile.phone ||
    formValues.taxId !== initialProfile.taxId ||
    formValues.iban !== initialProfile.iban ||
    formValues.address.line1 !== initialProfile.address.line1 ||
    formValues.address.line2 !== initialProfile.address.line2 ||
    formValues.address.postalCode !== initialProfile.address.postalCode ||
    formValues.address.city !== initialProfile.address.city ||
    formValues.address.province !== initialProfile.address.province ||
    formValues.address.country !== initialProfile.address.country

  const handleOpenChange = (next: boolean) => {
    if (!next && hasUnsavedChanges && !pending) {
      setDiscardConfirmOpen(true)
      return
    }
    onOpenChange(next)
  }

  const handleConfirmDiscard = () => {
    resetForm()
    onOpenChange(false)
  }

  const handleSubmitResult = (result: ProfileChangeApiResponse) => {
    if (result.ok) {
      toast.success(profile.successToast)
      onOpenChange(false)
      resetForm()
      router.refresh()
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

    toast.error(mapProfileChangeError(result.error))
    setFieldErrors({})
  }

  const handleFormSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (pending) return

    setFieldErrors({})
    setPending(true)

    try {
      const response = await fetch('/api/profile/change-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          website: '',
          name: formValues.name,
          email: formValues.email,
          phone: formValues.phone,
          taxId: formValues.taxId,
          iban: formValues.iban,
          address: formValues.address,
        }),
      })

      const result = (await response.json()) as ProfileChangeApiResponse
      handleSubmitResult(result)
    } catch {
      toast.error(profile.errors.create_failed)
      setFieldErrors({})
    } finally {
      setPending(false)
    }
  }

  const handlePostalBlur = async (postalCode: string) => {
    const lookup = await lookupPostalCode(postalCode)
    if (!lookup) return

    setFormValues((current) => ({
      ...current,
      address: {
        ...current.address,
        postalCode,
        city: current.address.city || lookup.city,
        province: current.address.province || lookup.province,
      },
    }))
  }

  return (
    <>
      <PortalSideDrawer open={open} onOpenChange={handleOpenChange} size="wide">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-4 pr-12 text-left">
            <DialogTitle className="font-sans text-lg font-semibold">
              {profile.drawer.title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {profile.requestModeHint}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 pt-6">
            <form
              id={PROFILE_CHANGE_FORM_ID}
              onSubmit={handleFormSubmit}
              className="flex flex-col gap-6"
              noValidate
            >
              <div className="flex flex-col gap-4">
                <DrawerField
                  id="drawer-name"
                  label={profile.labels.name}
                  name="name"
                  value={formValues.name}
                  error={fieldErrors.name}
                  autoComplete="name"
                  onChange={(name) => setFormValues((current) => ({ ...current, name }))}
                />
                <DrawerField
                  id="drawer-email"
                  label={profile.labels.email}
                  name="email"
                  type="email"
                  value={formValues.email}
                  error={fieldErrors.email}
                  autoComplete="email"
                  onChange={(email) => setFormValues((current) => ({ ...current, email }))}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <DrawerField
                    id="drawer-taxId"
                    label={profile.labels.taxId}
                    name="taxId"
                    value={formValues.taxId}
                    error={fieldErrors.taxId}
                    onChange={(taxId) => setFormValues((current) => ({ ...current, taxId }))}
                  />
                  <DrawerField
                    id="drawer-phone"
                    label={profile.labels.phone}
                    name="phone"
                    type="tel"
                    value={formValues.phone}
                    error={fieldErrors.phone}
                    autoComplete="tel"
                    onChange={(phone) => setFormValues((current) => ({ ...current, phone }))}
                  />
                </div>
                <DrawerField
                  id="drawer-iban"
                  label={profile.labels.iban}
                  name="iban"
                  value={formValues.iban}
                  error={fieldErrors.iban}
                  onChange={(iban) => setFormValues((current) => ({ ...current, iban }))}
                />
              </div>

              <div className="flex flex-col gap-4 border-t border-border pt-4 pb-6">
                <h3 className="font-sans text-sm font-semibold text-foreground">
                  {profile.sections.address}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <DrawerField
                    id="drawer-addressLine1"
                    label={profile.labels.addressLine1}
                    name="addressLine1"
                    value={formValues.address.line1}
                    error={fieldErrors.addressLine1}
                    className="sm:col-span-2"
                    onChange={(line1) =>
                      setFormValues((current) => ({
                        ...current,
                        address: { ...current.address, line1 },
                      }))
                    }
                  />
                  <DrawerField
                    id="drawer-addressLine2"
                    label={profile.labels.addressLine2}
                    name="addressLine2"
                    value={formValues.address.line2}
                    className="sm:col-span-2"
                    onChange={(line2) =>
                      setFormValues((current) => ({
                        ...current,
                        address: { ...current.address, line2 },
                      }))
                    }
                  />
                  <DrawerField
                    id="drawer-postalCode"
                    label={profile.labels.postalCode}
                    name="postalCode"
                    value={formValues.address.postalCode}
                    error={fieldErrors.postalCode}
                    onBlur={(postalCode) => void handlePostalBlur(postalCode)}
                    onChange={(postalCode) =>
                      setFormValues((current) => ({
                        ...current,
                        address: { ...current.address, postalCode },
                      }))
                    }
                  />
                  <DrawerField
                    id="drawer-city"
                    label={profile.labels.city}
                    name="city"
                    value={formValues.address.city}
                    error={fieldErrors.city}
                    onChange={(city) =>
                      setFormValues((current) => ({
                        ...current,
                        address: { ...current.address, city },
                      }))
                    }
                  />
                  <DrawerField
                    id="drawer-province"
                    label={profile.labels.province}
                    name="province"
                    value={formValues.address.province}
                    error={fieldErrors.province}
                    onChange={(province) =>
                      setFormValues((current) => ({
                        ...current,
                        address: { ...current.address, province },
                      }))
                    }
                  />
                  <DrawerField
                    id="drawer-country"
                    label={profile.labels.country}
                    name="country"
                    value={formValues.address.country}
                    error={fieldErrors.country}
                    onChange={(country) =>
                      setFormValues((current) => ({
                        ...current,
                        address: { ...current.address, country },
                      }))
                    }
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="shrink-0 border-t border-border bg-card px-6 pt-4 pb-6">
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
              >
                {profile.actions.cancel}
              </Button>
              <Button
                type="submit"
                form={PROFILE_CHANGE_FORM_ID}
                disabled={pending}
                aria-busy={pending}
              >
                {pending ? (
                  <>
                    <Loader2
                      className="size-4 animate-spin motion-reduce:animate-none"
                      aria-hidden
                    />
                    {profile.actions.submitting}
                  </>
                ) : (
                  profile.actions.submitRequest
                )}
              </Button>
            </div>
          </div>
        </div>
      </PortalSideDrawer>

      <PortalConfirmDialog
        open={discardConfirmOpen}
        onOpenChange={setDiscardConfirmOpen}
        title={profile.drawer.unsavedTitle}
        description={profile.drawer.unsavedDescription}
        confirmLabel={profile.drawer.discard}
        cancelLabel={profile.drawer.keepEditing}
        confirmVariant="destructive"
        onConfirm={handleConfirmDiscard}
      />
    </>
  )
}
