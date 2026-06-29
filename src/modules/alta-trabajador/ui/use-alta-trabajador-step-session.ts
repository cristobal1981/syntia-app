'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { readAltaTrabajadorDraft } from '@/src/modules/alta-trabajador/domain/alta-trabajador-draft'
import {
  getAltaTrabajadorStepPath,
  type AltaTrabajadorStepId,
} from '@/src/modules/alta-trabajador/domain/alta-trabajador-steps'
import { useAltaTrabajadorWizard } from '@/src/modules/alta-trabajador/ui/alta-trabajador-wizard-context'

/** En pasos del wizard: exige elegir en intro si hay borrador pendiente. */
export function useAltaTrabajadorStepSession(stepId: AltaTrabajadorStepId) {
  const router = useRouter()
  const { sessionActive, activateSession, setLastStepId } =
    useAltaTrabajadorWizard()

  useEffect(() => {
    if (sessionActive) {
      setLastStepId(stepId)
      return
    }

    const storedDraft = readAltaTrabajadorDraft()
    if (storedDraft) {
      router.replace('/alta-trabajador')
      return
    }

    activateSession()
    setLastStepId(stepId)
  }, [
    sessionActive,
    activateSession,
    setLastStepId,
    stepId,
    router,
  ])
}

export function getAltaTrabajadorResumePath(stepId: AltaTrabajadorStepId): string {
  return getAltaTrabajadorStepPath(stepId)
}
