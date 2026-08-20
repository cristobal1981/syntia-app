'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { getOnboardingTourSteps } from '@/src/modules/portal/domain/onboarding-tour-steps'
import { useIsDesktopViewport } from '@/src/modules/portal/ui/use-is-desktop-viewport'
import { OnboardingTourOverlay } from '@/src/modules/portal/ui/onboarding-tour-overlay'

const TOUR_STORAGE_KEY = 'syntia-onboarding-tour-seen'
const AUTO_LAUNCH_DELAY_MS = 900

function hasSeenTour(): boolean {
  try {
    return localStorage.getItem(TOUR_STORAGE_KEY) === '1'
  } catch {
    return true
  }
}

function markTourSeen() {
  try {
    localStorage.setItem(TOUR_STORAGE_KEY, '1')
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

type OnboardingTourContextValue = {
  start: () => void
}

const OnboardingTourContext = createContext<OnboardingTourContextValue | null>(null)

export function useOnboardingTourOptional() {
  return useContext(OnboardingTourContext)
}

type OnboardingTourProviderProps = {
  children: ReactNode
  enabled: boolean
}

export function OnboardingTourProvider({
  children,
  enabled,
}: OnboardingTourProviderProps) {
  const steps = useMemo(() => getOnboardingTourSteps(), [])
  const isDesktop = useIsDesktopViewport()
  const [isActive, setIsActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const hasAutoLaunchedRef = useRef(false)

  useEffect(() => {
    if (!enabled || !isDesktop || hasAutoLaunchedRef.current) return
    if (hasSeenTour()) return

    hasAutoLaunchedRef.current = true
    const timeout = setTimeout(() => {
      setStepIndex(0)
      setIsActive(true)
    }, AUTO_LAUNCH_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [enabled, isDesktop])

  const finishTour = useCallback(() => {
    setIsActive(false)
    markTourSeen()
  }, [])

  const start = useCallback(() => {
    setStepIndex(0)
    setIsActive(true)
  }, [])

  const next = useCallback(() => {
    setStepIndex((index) => {
      if (index + 1 >= steps.length) {
        finishTour()
        return index
      }
      return index + 1
    })
  }, [steps.length, finishTour])

  const prev = useCallback(() => {
    setStepIndex((index) => Math.max(0, index - 1))
  }, [])

  return (
    <OnboardingTourContext.Provider value={{ start }}>
      {children}
      {enabled ? (
        <OnboardingTourOverlay
          steps={steps}
          isActive={isActive}
          stepIndex={stepIndex}
          onNext={next}
          onPrev={prev}
          onSkip={finishTour}
        />
      ) : null}
    </OnboardingTourContext.Provider>
  )
}
