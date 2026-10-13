'use client'

import { Loader2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { profile } from '@/content/profile'
import type { ClientProfile } from '@/src/modules/profile/domain/types'
import { PortalConfirmDialog } from '@/src/modules/portal/ui/portal-confirm-dialog'
import { PortalSideDrawer } from '@/src/modules/portal/ui/portal-side-drawer'
import { DrawerField } from '@/src/modules/profile/ui/profile-drawer-field'
import { useProfileChangeForm } from '@/src/modules/profile/ui/use-profile-change-form'

const PROFILE_CHANGE_FORM_ID = 'profile-change-drawer-form'

type ProfileChangeDrawerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialProfile: ClientProfile
}

export function ProfileChangeDrawer({
  open,
  onOpenChange,
  initialProfile,
}: ProfileChangeDrawerProps) {
  const {
    formValues,
    setFormValues,
    fieldErrors,
    discardConfirmOpen,
    setDiscardConfirmOpen,
    pending,
    handleOpenChange,
    handleConfirmDiscard,
    handleFormSubmit,
    handlePostalBlur,
  } = useProfileChangeForm(initialProfile, open, onOpenChange)

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
                    id="drawer-vat"
                    label={profile.labels.vat}
                    name="vat"
                    value={formValues.vat}
                    error={fieldErrors.vat}
                    onChange={(vat) => setFormValues((current) => ({ ...current, vat }))}
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
