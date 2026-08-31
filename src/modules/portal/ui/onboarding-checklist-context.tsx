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
import { usePathname } from 'next/navigation'

import {
  CHECKLIST_ROUTE_STEPS,
  getOnboardingChecklistSteps,
  type ChecklistStepId,
} from '@/src/modules/portal/domain/onboarding-checklist-steps'
import { OnboardingChecklistWidget } from '@/src/modules/portal/ui/onboarding-checklist-widget'

const STORAGE_KEY = 'syntia-onboarding-checklist'
const AUTO_EXPAND_DELAY_MS = 900

type StoredState = {
  completed: ChecklistStepId[]
  dismissed: boolean
}

function readStoredState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { completed: [], dismissed: false }
    const parsed = JSON.parse(raw) as Partial<StoredState>
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed : [],
      dismissed: Boolean(parsed.dismissed),
    }
  } catch {
    return { completed: [], dismissed: true }
  }
}

function writeStoredState(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // ignore storage failures (private mode, quota, etc.)
  }
}

type OnboardingChecklistContextValue = {
  start: () => void
  markStepComplete: (id: ChecklistStepId) => void
}

const OnboardingChecklistContext =
  createContext<OnboardingChecklistContextValue | null>(null)

export function useOnboardingChecklistOptional() {
  return useContext(OnboardingChecklistContext)
}

type OnboardingChecklistProviderProps = {
  children: ReactNode
  enabled: boolean
}

export function OnboardingChecklistProvider({
  children,
  enabled,
}: OnboardingChecklistProviderProps) {
  const pathname = usePathname()
  const steps = useMemo(() => getOnboardingChecklistSteps(), [])
  const [completed, setCompleted] = useState<Set<ChecklistStepId>>(new Set())
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)
  // The step whose tip popup is currently shown — null when none is open.
  // Only one at a time: a second completion while one is still open just
  // replaces it, rather than queuing (visiting two sections at once isn't
  // something a user can actually do).
  const [activeTip, setActiveTip] = useState<ChecklistStepId | null>(null)
  // Gates the persistence effect below until the stored state has actually been
  // read: without it, that effect's first run (on mount, before the load below
  // resolves) would write the still-default empty/false values right over
  // whatever was saved from a previous session.
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!enabled) return
    // localStorage solo existe en cliente — no se puede leer durante SSR.
    const stored = readStoredState()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCompleted(new Set(stored.completed))
    setDismissed(stored.dismissed)
    setLoaded(true)
  }, [enabled])

  useEffect(() => {
    if (!loaded) return
    writeStoredState({ completed: [...completed], dismissed })
  }, [loaded, completed, dismissed])

  useEffect(() => {
    if (!enabled || !loaded || dismissed) return
    const timeout = setTimeout(() => setExpanded(true), AUTO_EXPAND_DELAY_MS)
    return () => clearTimeout(timeout)
  }, [enabled, loaded, dismissed])

  // First-time completion of a step (route visit or a manual markStepComplete
  // call below) surfaces its tip inside the checklist card itself — forcing it
  // open if it was collapsed, since that's the only place the tip renders now
  // (a separate floating popup read as "two things," per user feedback). Steps
  // already completed don't retrigger it; use `showTip` to re-open one on demand.
  const completeStep = useCallback(
    (id: ChecklistStepId) => {
      if (completed.has(id)) return
      setCompleted((prev) => (prev.has(id) ? prev : new Set(prev).add(id)))
      setActiveTip(id)
      setExpanded(true)
    },
    [completed]
  )

  // Mark route-based steps complete just by visiting them — no DOM target to
  // find, no waiting on layout: pathname is already the source of truth.
  useEffect(() => {
    if (!enabled || !loaded || dismissed) return
    const step = (Object.keys(CHECKLIST_ROUTE_STEPS) as ChecklistStepId[]).find(
      (id) => CHECKLIST_ROUTE_STEPS[id] === pathname
    )
    if (!step) return
    // Reacciona a la navegación (pathname) marcando el paso visitado — estado
    // acumulado a lo largo del tiempo, no derivable en render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    completeStep(step)
    // completeStep intentionally omitted: it changes identity with `completed`
    // on every completion, which would refire this on unrelated steps too.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, loaded, dismissed, pathname])

  const markStepComplete = useCallback(
    (id: ChecklistStepId) => {
      if (!enabled || dismissed) return
      completeStep(id)
    },
    [enabled, dismissed, completeStep]
  )

  // Preview a step's tip on demand (clicking it in the list) without touching
  // completion state — independent of completeStep above.
  const showTip = useCallback((id: ChecklistStepId) => setActiveTip(id), [])

  const start = useCallback(() => {
    setDismissed(false)
    setExpanded(true)
  }, [])

  const expand = useCallback(() => setExpanded(true), [])
  // Collapsing to the pill also drops whatever tip was showing — it's part of
  // the same card now, so there's nowhere for it to live once collapsed.
  const collapse = useCallback(() => {
    setExpanded(false)
    setActiveTip(null)
  }, [])
  const dismiss = useCallback(() => {
    setExpanded(false)
    setActiveTip(null)
    setDismissed(true)
  }, [])

  const activeTipStep = steps.find((step) => step.id === activeTip) ?? null

  return (
    <OnboardingChecklistContext.Provider value={{ start, markStepComplete }}>
      {children}
      {enabled && !dismissed ? (
        <OnboardingChecklistWidget
          steps={steps}
          completed={completed}
          expanded={expanded}
          activeTip={activeTipStep}
          onExpand={expand}
          onCollapse={collapse}
          onDismiss={dismiss}
          onShowTip={showTip}
        />
      ) : null}
    </OnboardingChecklistContext.Provider>
  )
}
