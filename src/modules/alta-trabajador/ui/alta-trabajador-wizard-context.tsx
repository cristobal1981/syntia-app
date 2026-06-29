'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  clearAltaTrabajadorDraft,
  readAltaTrabajadorDraft,
  writeAltaTrabajadorDraft,
} from '@/src/modules/alta-trabajador/domain/alta-trabajador-draft'
import {
  EMPTY_ALTA_TRABAJADOR_FORM,
  type AltaTrabajadorFormValues,
} from '@/src/modules/alta-trabajador/domain/alta-trabajador-form-types'
import type { AltaTrabajadorStepId } from '@/src/modules/alta-trabajador/domain/alta-trabajador-steps'

type AltaTrabajadorWizardContextValue = {
  values: AltaTrabajadorFormValues
  lastStepId: AltaTrabajadorStepId
  sessionActive: boolean
  activateSession: () => void
  setField: <K extends keyof AltaTrabajadorFormValues>(
    key: K,
    value: AltaTrabajadorFormValues[K]
  ) => void
  setValues: (patch: Partial<AltaTrabajadorFormValues>) => void
  setLastStepId: (stepId: AltaTrabajadorStepId) => void
  resumeDraft: () => AltaTrabajadorStepId
  startFresh: () => void
  reset: () => void
  /** Tras envío correcto: borra borrador sin vaciar el formulario en pantalla. */
  completeSubmission: () => void
}

const AltaTrabajadorWizardContext =
  createContext<AltaTrabajadorWizardContextValue | null>(null)

export function AltaTrabajadorWizardProvider({ children }: { children: ReactNode }) {
  const [values, setValuesState] = useState<AltaTrabajadorFormValues>(
    EMPTY_ALTA_TRABAJADOR_FORM
  )
  const [lastStepId, setLastStepIdState] =
    useState<AltaTrabajadorStepId>('datos-trabajador')
  const [sessionActive, setSessionActive] = useState(false)

  useEffect(() => {
    if (!sessionActive) return
    writeAltaTrabajadorDraft({ values, lastStepId })
  }, [sessionActive, values, lastStepId])

  const setField = useCallback(
    <K extends keyof AltaTrabajadorFormValues>(
      key: K,
      value: AltaTrabajadorFormValues[K]
    ) => {
      setValuesState((current) => ({ ...current, [key]: value }))
    },
    []
  )

  const setValues = useCallback((patch: Partial<AltaTrabajadorFormValues>) => {
    setValuesState((current) => ({ ...current, ...patch }))
  }, [])

  const setLastStepId = useCallback((stepId: AltaTrabajadorStepId) => {
    setLastStepIdState(stepId)
  }, [])

  const activateSession = useCallback(() => {
    setSessionActive(true)
  }, [])

  const resumeDraft = useCallback(() => {
    const draft = readAltaTrabajadorDraft()
    const nextValues = draft?.values ?? EMPTY_ALTA_TRABAJADOR_FORM
    const nextStep = draft?.lastStepId ?? 'datos-trabajador'
    setValuesState(nextValues)
    setLastStepIdState(nextStep)
    setSessionActive(true)
    return nextStep
  }, [])

  const startFresh = useCallback(() => {
    setValuesState(EMPTY_ALTA_TRABAJADOR_FORM)
    setLastStepIdState('datos-trabajador')
    setSessionActive(true)
    clearAltaTrabajadorDraft()
  }, [])

  const reset = useCallback(() => {
    setValuesState(EMPTY_ALTA_TRABAJADOR_FORM)
    setLastStepIdState('datos-trabajador')
    setSessionActive(false)
    clearAltaTrabajadorDraft()
  }, [])

  const completeSubmission = useCallback(() => {
    setSessionActive(false)
    clearAltaTrabajadorDraft()
  }, [])

  const contextValue = useMemo(
    () => ({
      values,
      lastStepId,
      sessionActive,
      activateSession,
      setField,
      setValues,
      setLastStepId,
      resumeDraft,
      startFresh,
      reset,
      completeSubmission,
    }),
    [
      values,
      lastStepId,
      sessionActive,
      activateSession,
      setField,
      setValues,
      setLastStepId,
      resumeDraft,
      startFresh,
      reset,
      completeSubmission,
    ]
  )

  return (
    <AltaTrabajadorWizardContext.Provider value={contextValue}>
      {children}
    </AltaTrabajadorWizardContext.Provider>
  )
}

export function useAltaTrabajadorWizard() {
  const context = useContext(AltaTrabajadorWizardContext)
  if (!context) {
    throw new Error(
      'useAltaTrabajadorWizard must be used within AltaTrabajadorWizardProvider'
    )
  }
  return context
}
