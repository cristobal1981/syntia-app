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
  EMPTY_ALTA_AUTONOMO_FORM,
  type AltaAutonomoFormValues,
} from '@/src/modules/alta-autonomo/domain/alta-autonomo-form-types'

const STORAGE_KEY = 'syntia-alta-autonomo-draft'

type AltaAutonomoWizardContextValue = {
  values: AltaAutonomoFormValues
  setField: <K extends keyof AltaAutonomoFormValues>(
    key: K,
    value: AltaAutonomoFormValues[K]
  ) => void
  setValues: (patch: Partial<AltaAutonomoFormValues>) => void
  reset: () => void
}

const AltaAutonomoWizardContext =
  createContext<AltaAutonomoWizardContextValue | null>(null)

function loadDraft(): AltaAutonomoFormValues {
  if (typeof window === 'undefined') return EMPTY_ALTA_AUTONOMO_FORM

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_ALTA_AUTONOMO_FORM
    const parsed = JSON.parse(raw) as Partial<AltaAutonomoFormValues>
    return { ...EMPTY_ALTA_AUTONOMO_FORM, ...parsed }
  } catch {
    return EMPTY_ALTA_AUTONOMO_FORM
  }
}

function saveDraft(values: AltaAutonomoFormValues) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(values))
  } catch {
    // ignore quota errors
  }
}

export function AltaAutonomoWizardProvider({ children }: { children: ReactNode }) {
  const [values, setValuesState] = useState<AltaAutonomoFormValues>(
    EMPTY_ALTA_AUTONOMO_FORM
  )
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setValuesState(loadDraft())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    saveDraft(values)
  }, [hydrated, values])

  const setField = useCallback(
    <K extends keyof AltaAutonomoFormValues>(
      key: K,
      value: AltaAutonomoFormValues[K]
    ) => {
      setValuesState((current) => ({ ...current, [key]: value }))
    },
    []
  )

  const setValues = useCallback((patch: Partial<AltaAutonomoFormValues>) => {
    setValuesState((current) => ({ ...current, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setValuesState(EMPTY_ALTA_AUTONOMO_FORM)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const contextValue = useMemo(
    () => ({ values, setField, setValues, reset }),
    [reset, setField, setValues, values]
  )

  if (!hydrated) {
    return null
  }

  return (
    <AltaAutonomoWizardContext.Provider value={contextValue}>
      {children}
    </AltaAutonomoWizardContext.Provider>
  )
}

export function useAltaAutonomoWizard() {
  const context = useContext(AltaAutonomoWizardContext)
  if (!context) {
    throw new Error(
      'useAltaAutonomoWizard must be used within AltaAutonomoWizardProvider'
    )
  }
  return context
}
