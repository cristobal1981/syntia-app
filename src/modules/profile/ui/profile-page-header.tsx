'use client'

import { PenLine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { portal } from '@/content/portal'
import { profile } from '@/content/profile'
import { useOnboardingChecklistOptional } from '@/src/modules/portal/ui/onboarding-checklist-context'
import { useProfileChangeDrawer } from '@/src/modules/profile/ui/profile-change-drawer-state'

/**
 * Cabecera de Perfil: no depende de los datos, así que se pinta antes que ellos
 * (y también en `loading`). «Solicitar cambio» se activa cuando llega el perfil.
 */
export function ProfilePageHeader() {
  const onboardingChecklist = useOnboardingChecklistOptional()
  const drawer = useProfileChangeDrawer()

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="max-w-2xl">
        <h1 className="font-sans text-2xl font-semibold text-foreground md:text-3xl">
          {profile.pageTitle}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground md:text-base">
          {profile.pageDescription}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        {onboardingChecklist ? (
          <Button type="button" variant="outline" onClick={onboardingChecklist.start}>
            {portal.onboardingChecklist.reopenLabel}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="default"
          disabled={!drawer?.ready}
          onClick={() => drawer?.setOpen(true)}
        >
          <PenLine className="size-4" aria-hidden />
          {profile.actions.requestChange}
        </Button>
      </div>
    </header>
  )
}
