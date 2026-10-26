'use client'

import { PenLine } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { profile } from '@/content/profile'
import { useProfileChangeDrawer } from '@/src/modules/profile/ui/profile-change-drawer-state'

/** Se activa cuando llegan los datos (el drawer avisa con `ready`). */
export function ProfileRequestChangeButton() {
  const drawer = useProfileChangeDrawer()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!drawer?.ready}
      onClick={() => drawer?.setOpen(true)}
    >
      <PenLine className="size-4" aria-hidden />
      {profile.actions.requestChange}
    </Button>
  )
}
