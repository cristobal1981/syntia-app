'use client'

import { LazyMotion, domAnimation, m } from 'framer-motion'
import { CheckCircle2Icon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { profile } from '@/content/profile'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'

export const PROFILE_SUCCESS_AUTO_DISMISS_MS = 6000
const easeOut = [0.22, 1, 0.36, 1] as const

type ProfileSuccessDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProfileSuccessDialog({ open, onOpenChange }: ProfileSuccessDialogProps) {
  const reducedMotion = usePrefersReducedMotion()
  const [progress, setProgress] = useState(1)
  const endsAtRef = useRef(0)
  const remainingMsRef = useRef(PROFILE_SUCCESS_AUTO_DISMISS_MS)
  const isHoveredRef = useRef(false)

  useEffect(() => {
    if (!open) return

    endsAtRef.current = Date.now() + PROFILE_SUCCESS_AUTO_DISMISS_MS
    remainingMsRef.current = PROFILE_SUCCESS_AUTO_DISMISS_MS
    isHoveredRef.current = false
    setProgress(1)

    let raf = 0
    const loop = () => {
      const hovered = isHoveredRef.current
      const remaining = hovered
        ? remainingMsRef.current
        : Math.max(0, endsAtRef.current - Date.now())

      if (!hovered) {
        remainingMsRef.current = remaining
      }

      setProgress(remaining / PROFILE_SUCCESS_AUTO_DISMISS_MS)

      if (remaining <= 0 && !hovered) {
        onOpenChange(false)
        return
      }

      raf = window.requestAnimationFrame(loop)
    }

    raf = window.requestAnimationFrame(loop)
    return () => window.cancelAnimationFrame(raf)
  }, [open, onOpenChange])

  const handlePointerEnter = () => {
    remainingMsRef.current = Math.max(0, endsAtRef.current - Date.now())
    isHoveredRef.current = true
  }

  const handlePointerLeave = () => {
    endsAtRef.current = Date.now() + remainingMsRef.current
    isHoveredRef.current = false
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="overflow-hidden border-primary/30 bg-surface-light p-0 text-on-light dark:bg-surface-dark dark:text-on-dark"
      >
        <LazyMotion features={domAnimation}>
          <m.div
            className="relative flex flex-col items-center gap-5 px-6 pt-8 pb-6 text-center"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.35, ease: easeOut }}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          >
            <div className="relative flex size-14 items-center justify-center">
              {!reducedMotion ? (
                <m.span
                  className="absolute inset-0 rounded-full border-2 border-primary/50"
                  initial={{ scale: 0.6, opacity: 0.7 }}
                  animate={{ scale: 1.55, opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
                  aria-hidden
                />
              ) : null}

              <m.div
                className="relative flex size-14 items-center justify-center rounded-full bg-primary/15 text-primary"
                initial={reducedMotion ? false : { scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 420,
                  damping: 16,
                  delay: 0.05,
                }}
              >
                <m.div
                  initial={reducedMotion ? false : { scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 14,
                    delay: 0.2,
                  }}
                >
                  <CheckCircle2Icon className="size-7" aria-hidden />
                </m.div>
              </m.div>
            </div>

            <DialogHeader className="items-center gap-1.5 sm:text-center">
              <DialogTitle id="profile-success-title">
                {profile.successTitle}
              </DialogTitle>
              <DialogDescription className="text-pretty text-muted-foreground dark:text-muted-on-dark">
                {profile.successMessage}
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="w-full sm:justify-center">
              <Button type="button" className="w-full sm:w-auto" onClick={() => onOpenChange(false)}>
                {profile.successDismiss}
              </Button>
            </DialogFooter>

            {!reducedMotion ? (
              <m.div
                className="absolute inset-x-0 bottom-0 h-1 bg-primary/20"
                aria-hidden
              >
                <div
                  className="h-full origin-left bg-primary"
                  style={{ transform: `scaleX(${progress})` }}
                />
              </m.div>
            ) : null}
          </m.div>
        </LazyMotion>
      </DialogContent>
    </Dialog>
  )
}
