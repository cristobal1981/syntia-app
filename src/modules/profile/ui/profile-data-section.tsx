'use client'

import { useEffect } from 'react'

import { profile } from '@/content/profile'
import { maskIban } from '@/lib/profile/validate-profile-change'
import type { ClientProfile } from '@/src/modules/profile/domain/types'
import { ProfileChangeDrawer } from '@/src/modules/profile/ui/profile-change-drawer'
import { useProfileChangeDrawer } from '@/src/modules/profile/ui/profile-change-drawer-state'
import { ProfileFieldRow } from '@/src/modules/profile/ui/profile-field-row'

/** Dirección en tres líneas legibles; vacía si no hay nada. */
function formatAddress(address: ClientProfile['address']): string {
  const clean = (...parts: string[]) => parts.map((part) => part.trim()).filter(Boolean)
  const street = clean(address.line1, address.line2).join(', ')
  const town = [clean(address.postalCode, address.city).join(' '), address.province.trim()]
    .filter(Boolean)
    .join(', ')

  return [street, town, address.country.trim()].filter(Boolean).join('\n')
}

/** Datos de contacto y fiscales en solo lectura, y el drawer con el que se solicita un cambio. */
export function ProfileDataSection({ initialProfile }: { initialProfile: ClientProfile }) {
  const drawer = useProfileChangeDrawer()
  const setDrawerReady = drawer?.setReady
  useEffect(() => {
    setDrawerReady?.(true)
    return () => setDrawerReady?.(false)
  }, [setDrawerReady])

  const hasIban = Boolean(initialProfile.iban.trim())

  return (
    <>
      <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <ProfileFieldRow label={profile.labels.vat} value={initialProfile.vat} />
        <ProfileFieldRow
          label={profile.labels.phone}
          value={initialProfile.phone || profile.emptyPhone}
        />
        <ProfileFieldRow
          label={profile.labels.iban}
          value={hasIban ? maskIban(initialProfile.iban) : ''}
          monospace={hasIban}
        />
        <ProfileFieldRow
          label={profile.sections.address}
          value={formatAddress(initialProfile.address)}
          className="whitespace-pre-line sm:col-span-2"
        />
      </dl>

      <ProfileChangeDrawer
        open={drawer?.open ?? false}
        onOpenChange={(open) => drawer?.setOpen(open)}
        initialProfile={initialProfile}
      />
    </>
  )
}
