'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type CSSProperties } from 'react'

import { Button } from '@/components/ui/button'
import { portal } from '@/content/portal'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'
import type { OnboardingTourStep } from '@/src/modules/portal/domain/onboarding-tour-steps'
import { usePortalCreateConsultaOptional } from '@/src/modules/portal/ui/portal-create-consulta-context'

const copy = portal.onboardingTour
const SPOTLIGHT_PADDING = 8
const CALLOUT_WIDTH = 320
const CALLOUT_GAP = 12
const CALLOUT_ESTIMATED_HEIGHT = 200
const CALLOUT_EDGE_MARGIN = 24

type OnboardingTourOverlayProps = {
  steps: OnboardingTourStep[]
  isActive: boolean
  stepIndex: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

function formatStepCounter(current: number, total: number): string {
  return copy.stepCounter
    .replace('{current}', String(current))
    .replace('{total}', String(total))
}

export function OnboardingTourOverlay({
  steps,
  isActive,
  stepIndex,
  onNext,
  onPrev,
  onSkip,
}: OnboardingTourOverlayProps) {
  const router = useRouter()
  const pathname = usePathname()
  const createConsulta = usePortalCreateConsultaOptional()
  const reducedMotion = usePrefersReducedMotion()
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = steps[stepIndex]

  // Show, don't tell: actually take the user to what each step is talking about.
  useEffect(() => {
    if (!isActive || !step) return
    if (step.route && pathname !== step.route) {
      router.push(step.route)
    }
  }, [isActive, step, pathname, router])

  // Open the real "Nueva consulta" drawer for the step that talks about it, and
  // close it again when the tour moves on (next/prev/skip/finish/unmount).
  useEffect(() => {
    if (!isActive || !step?.opensCreateConsulta) return
    createConsulta?.openCreateConsulta()
    return () => createConsulta?.closeCreateConsulta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, step])

  // Scroll the target into view once per step change only — re-running this from
  // the resize/scroll listeners below would retrigger scrollIntoView's own scroll
  // events in a feedback loop and the spotlight would never settle.
  useEffect(() => {
    if (!isActive || !step || step.opensCreateConsulta) return
    const element = document.querySelector(step.selector)
    if (!element) return
    element.scrollIntoView({
      block: 'nearest',
      behavior: reducedMotion ? 'auto' : 'smooth',
    })
  }, [isActive, step, reducedMotion])

  useEffect(() => {
    if (!isActive || !step || step.opensCreateConsulta) {
      setRect(null)
      return
    }

    function updateRect() {
      const element = document.querySelector(step.selector)
      setRect(element ? element.getBoundingClientRect() : null)
    }

    updateRect()
    const raf = requestAnimationFrame(updateRect)
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [isActive, step])

  useEffect(() => {
    if (!isActive) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onSkip()
      if (event.key === 'ArrowRight' || event.key === 'Enter') onNext()
      if (event.key === 'ArrowLeft') onPrev()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isActive, onNext, onPrev, onSkip])

  if (!isActive || !step) return null

  const showSpotlight = !step.opensCreateConsulta

  const highlightStyle: CSSProperties = rect
    ? {
        top: rect.top - SPOTLIGHT_PADDING,
        left: rect.left - SPOTLIGHT_PADDING,
        width: rect.width + SPOTLIGHT_PADDING * 2,
        height: rect.height + SPOTLIGHT_PADDING * 2,
        boxShadow: '0 0 0 9999px rgba(2, 20, 24, 0.72)',
      }
    : { top: 0, left: 0, width: 0, height: 0, opacity: 0 }

  const viewportHeight = typeof window === 'undefined' ? 0 : window.innerHeight
  const viewportWidth = typeof window === 'undefined' ? 0 : window.innerWidth

  const calloutStyle: CSSProperties = (() => {
    if (!showSpotlight) {
      // The drawer itself occupies the right edge of the screen — anchor clear of it.
      return { left: CALLOUT_EDGE_MARGIN, bottom: CALLOUT_EDGE_MARGIN }
    }
    if (!rect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }
    const calloutBelow =
      rect.bottom + CALLOUT_ESTIMATED_HEIGHT + CALLOUT_GAP < viewportHeight
    const left = Math.min(
      Math.max(16, rect.left),
      viewportWidth - CALLOUT_WIDTH - 16
    )
    return {
      left,
      ...(calloutBelow
        ? { top: rect.bottom + SPOTLIGHT_PADDING + CALLOUT_GAP }
        : {
            top: rect.top - SPOTLIGHT_PADDING - CALLOUT_GAP,
            transform: 'translateY(-100%)',
          }),
    }
  })()

  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label={step.title}
    >
      {showSpotlight ? (
        <div
          className={cn(
            'pointer-events-none fixed rounded-lg ring-2 ring-primary',
            !reducedMotion && 'transition-[top,left,width,height] duration-300'
          )}
          style={highlightStyle}
        />
      ) : null}

      <div
        className={cn(
          'pointer-events-auto fixed w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-5 shadow-lg',
          showSpotlight && !reducedMotion && 'transition-[top,left] duration-300'
        )}
        style={{ width: CALLOUT_WIDTH, ...calloutStyle }}
      >
        <p className="text-xs font-medium text-muted-foreground">
          {formatStepCounter(stepIndex + 1, steps.length)}
        </p>
        <h2 className="mt-1 font-sans text-base font-semibold text-foreground">
          {step.title}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {step.description}
        </p>
        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="cursor-pointer text-sm text-muted-foreground hover:text-foreground"
          >
            {copy.skip}
          </button>
          <div className="flex gap-2">
            {!isFirst ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={onPrev}
              >
                {copy.prev}
              </Button>
            ) : null}
            <Button type="button" size="sm" className="cursor-pointer" onClick={onNext}>
              {isLast ? copy.finish : copy.next}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
