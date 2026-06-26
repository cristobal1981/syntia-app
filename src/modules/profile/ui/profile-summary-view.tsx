'use client'

import { useState } from 'react'
import {
  IdCard,
  Landmark,
  Mail,
  MapPin,
  PenLine,
  Phone,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { profile } from '@/content/profile'
import { maskIban } from '@/lib/profile/validate-profile-change'
import type { ClientProfile } from '@/src/modules/profile/domain/types'
import { ProfileChangeDrawer } from '@/src/modules/profile/ui/profile-change-drawer'
import { ProfileFieldRow } from '@/src/modules/profile/ui/profile-field-row'

type ProfileSummaryViewProps = {
  initialProfile: ClientProfile
}

function getProfileInitial(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

function ProfileSectionHeading({
  id,
  icon: Icon,
  children,
}: {
  id: string
  icon?: LucideIcon
  children: string
}) {
  return (
    <h3
      id={id}
      className="flex items-center gap-2 font-sans text-sm font-semibold text-foreground"
    >
      {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
      {children}
    </h3>
  )
}

export function ProfileSummaryView({ initialProfile }: ProfileSummaryViewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const hasIban = Boolean(initialProfile.iban.trim())
  const displayIban = hasIban ? maskIban(initialProfile.iban) : ''
  const { address } = initialProfile
  const hasAddressLine =
    address.line1.trim() ||
    address.line2.trim() ||
    address.postalCode.trim() ||
    address.city.trim() ||
    address.province.trim() ||
    address.country.trim()

  return (
    <>
      <div className="flex w-full flex-col gap-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
              {profile.pageTitle}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
              {profile.pageDescription}
            </p>
          </div>
          <Button
            type="button"
            variant="default"
            className="shrink-0"
            onClick={() => setDrawerOpen(true)}
          >
            <PenLine className="size-4" aria-hidden />
            {profile.actions.requestChange}
          </Button>
        </header>

        <article className="w-full overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center gap-4 border-b border-border px-5 py-4 md:px-6 md:py-5">
            <div
              className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/12 font-sans text-lg font-semibold text-primary"
              aria-hidden
            >
              {getProfileInitial(initialProfile.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-sans text-base font-semibold text-foreground">
                {initialProfile.name}
              </p>
              <p className="truncate font-body text-sm text-muted-foreground">
                {initialProfile.email || profile.emptyValue}
              </p>
            </div>
          </div>

          <section
            className="border-b border-border px-5 py-4 md:px-6 md:py-5"
            aria-label={profile.sections.personal}
          >
            <dl className="flex flex-col gap-4">
              <ProfileFieldRow
                icon={Mail}
                label={profile.labels.email}
                value={initialProfile.email}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <ProfileFieldRow
                  icon={IdCard}
                  label={profile.labels.taxId}
                  value={initialProfile.taxId}
                />
                <ProfileFieldRow
                  icon={Phone}
                  label={profile.labels.phone}
                  value={initialProfile.phone || profile.emptyPhone}
                />
              </div>
              <ProfileFieldRow
                icon={Landmark}
                label={profile.labels.iban}
                value={displayIban}
                monospace={hasIban}
              />
            </dl>
          </section>

          <section
            className="px-5 py-4 md:px-6 md:py-5"
            aria-labelledby="profile-address"
          >
            <ProfileSectionHeading id="profile-address" icon={MapPin}>
              {profile.sections.address}
            </ProfileSectionHeading>
            {hasAddressLine ? (
              <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ProfileFieldRow
                  label={profile.labels.addressLine1}
                  value={address.line1}
                  className="sm:col-span-2 lg:col-span-4"
                />
                {address.line2.trim() ? (
                  <ProfileFieldRow
                    label={profile.labels.addressLine2}
                    value={address.line2}
                    className="sm:col-span-2 lg:col-span-4"
                  />
                ) : null}
                <ProfileFieldRow label={profile.labels.postalCode} value={address.postalCode} />
                <ProfileFieldRow label={profile.labels.city} value={address.city} />
                <ProfileFieldRow label={profile.labels.province} value={address.province} />
                <ProfileFieldRow label={profile.labels.country} value={address.country} />
              </dl>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                {profile.emptyValue}
              </p>
            )}
          </section>
        </article>
      </div>

      <ProfileChangeDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        initialProfile={initialProfile}
      />
    </>
  )
}
