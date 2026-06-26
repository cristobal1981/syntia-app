'use client'

import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

import { site } from '@/content/site'
import { portal } from '@/content/portal'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { cn } from '@/lib/utils'

const PHRASE_INTERVAL_MS = 2000;
const PROGRESS_TICK_MS = 120;
const PROGRESS_CAP = 92;
const COMPLETE_DELAY_MS = 420;

type AuthSessionOverlayProps =
  | {
      variant: 'sign-out'
    }
  | {
      variant: 'entry'
      ready?: boolean
      onDismiss?: () => void
    }

export function AuthSessionOverlay(props: AuthSessionOverlayProps) {
  if (props.variant === 'sign-out') {
    return <SignOutOverlay />
  }

  return (
    <EntryOverlay ready={props.ready ?? false} onDismiss={props.onDismiss} />
  )
}

function SignOutOverlay() {
  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 px-6 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="portal-home-card flex max-w-sm flex-col items-center gap-4 rounded-xl px-6 py-6 text-center shadow-lg">
        <p className="text-base font-semibold text-foreground">
          {portal.authLoading.signOutMessage}
        </p>
        <Loader2
          className="size-6 animate-spin text-primary motion-reduce:animate-none"
          aria-hidden
        />
      </div>
    </div>
  )
}

function EntryOverlay({
  ready,
  onDismiss,
}: {
  ready: boolean
  onDismiss?: () => void
}) {
  const reducedMotion = usePrefersReducedMotion()
  const phrases = portal.authLoading.entryPhrases
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(true)
  const [startedAt] = useState(() => Date.now())

  useEffect(() => {
    if (ready) return

    const phraseTimer = window.setInterval(() => {
      setPhraseIndex((index) => (index + 1) % phrases.length)
    }, PHRASE_INTERVAL_MS)

    const progressTimer = window.setInterval(() => {
      setProgress((value) => {
        if (value >= PROGRESS_CAP) return value
        const step = value < 50 ? 2.4 : value < 80 ? 1.2 : 0.45
        return Math.min(PROGRESS_CAP, value + step)
      })
    }, PROGRESS_TICK_MS)

    return () => {
      window.clearInterval(phraseTimer)
      window.clearInterval(progressTimer)
    }
  }, [ready, phrases.length])

  useEffect(() => {
    if (!ready) return

    let dismissTimer: number | undefined

    const finish = () => {
      setProgress(100)
      dismissTimer = window.setTimeout(() => {
        setVisible(false)
        onDismiss?.()
      }, COMPLETE_DELAY_MS)
    }

    const elapsed = Date.now() - startedAt
    const remaining = portal.authLoading.entryMinDisplayMs - elapsed

    if (remaining > 0) {
      const minTimer = window.setTimeout(finish, remaining)
      return () => {
        window.clearTimeout(minTimer)
        if (dismissTimer !== undefined) window.clearTimeout(dismissTimer)
      }
    }

    finish()
    return () => {
      if (dismissTimer !== undefined) window.clearTimeout(dismissTimer)
    }
  }, [ready, onDismiss, startedAt])

  if (!visible) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-[110] flex items-center justify-center bg-background px-6 transition-opacity duration-300',
        ready && 'opacity-0'
      )}
      role="status"
      aria-live="polite"
      aria-busy={!ready}
    >
      <div className="flex w-full max-w-md flex-col items-center">
        <div className="mb-8 flex justify-center">
          <Image
            src={site.brand.logoHorizontalPositivo}
            alt="Syntia"
            width={180}
            height={40}
            priority
            className="h-9 w-auto dark:hidden"
          />
          <Image
            src={site.brand.logoHorizontalNegativo}
            alt="Syntia"
            width={180}
            height={40}
            priority
            className="hidden h-9 w-auto dark:block"
          />
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-primary/15">
          <div
            className={cn(
              'h-full rounded-full bg-primary',
              !reducedMotion && 'transition-[width] duration-300 ease-out'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p
          key={phraseIndex}
          className={cn(
            'mt-5 text-center text-sm font-medium text-foreground',
            !reducedMotion && 'animate-in fade-in duration-300'
          )}
        >
          {phrases[phraseIndex]}
        </p>
      </div>
    </div>
  )
}
