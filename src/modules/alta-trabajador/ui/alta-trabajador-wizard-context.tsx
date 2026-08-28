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
import type { PortalChatterUploadFile } from '@/src/modules/portal/domain/portal-chatter-types'

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
  /** Tras envío correcto: borra el borrador y vacía el formulario en memoria. */
  completeSubmission: () => void
  /** Adjunto de documentación identificativa. No se persiste en el borrador (sessionStorage). */
  attachment: PortalChatterUploadFile | null
  setAttachment: (file: PortalChatterUploadFile | null) => void
}

const AltaTrabajadorWizardContext =
  createContext<AltaTrabajadorWizardContextValue | null>(null)

export function AltaTrabajadorWizardProvider({ children }: { children: ReactNode }) {
  const [values, setValuesState] = useState<AltaTrabajadorFormValues>(
    EMPTY_ALTA_TRABAJADOR_FORM
  )
  const [lastStepId, setLastStepIdState] =
    useState<AltaTrabajadorStepId>('datos-personales')
  const [sessionActive, setSessionActive] = useState(false)
  const [attachment, setAttachment] = useState<PortalChatterUploadFile | null>(null)

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
    const nextStep = draft?.lastStepId ?? 'datos-personales'
    setValuesState(nextValues)
    setLastStepIdState(nextStep)
    setSessionActive(true)
    return nextStep
  }, [])

  const startFresh = useCallback(() => {
    setValuesState(EMPTY_ALTA_TRABAJADOR_FORM)
    setLastStepIdState('datos-personales')
    setSessionActive(true)
    setAttachment(null)
    clearAltaTrabajadorDraft()
  }, [])

  const reset = useCallback(() => {
    setValuesState(EMPTY_ALTA_TRABAJADOR_FORM)
    setLastStepIdState('datos-personales')
    setSessionActive(false)
    setAttachment(null)
    clearAltaTrabajadorDraft()
  }, [])

  const completeSubmission = useCallback(() => {
    // Vaciar `values` (no solo borrar el borrador) es necesario: mientras el
    // router.push de éxito completa la transición, este provider sigue montado
    // y useAltaTrabajadorStepSession puede reactivar sessionActive al ver que
    // ya no hay borrador, lo que reescribiría `values` como borrador nuevo. Al
    // quedar vacío, hasAltaTrabajadorDraftContent lo descarta igualmente.
    setValuesState(EMPTY_ALTA_TRABAJADOR_FORM)
    setLastStepIdState('datos-personales')
    setSessionActive(false)
    setAttachment(null)
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
      attachment,
      setAttachment,
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
      attachment,
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
