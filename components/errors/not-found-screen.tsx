'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { LazyMotion, domAnimation, m } from 'framer-motion'

import { DvdBounceLogo } from '@/components/errors/dvd-bounce-logo'
import { TechAmbientBackdrop } from '@/components/errors/tech-ambient-backdrop'
import { MarketingButton } from '@/components/ui/marketing-button'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'

type NotFoundScreenProps = {
  code: string
  title: string
  description: string
  playHint: string
  primaryHref: string
  primaryLabel: string
}

const easeOut = [0.22, 1, 0.36, 1] as const

export function NotFoundScreen({
  code,
  title,
  description,
  playHint,
  primaryHref,
  primaryLabel,
}: NotFoundScreenProps) {
  const reducedMotion = usePrefersReducedMotion()

  const fadeUp = (delay = 0) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: easeOut },
        }

  return (
    <LazyMotion features={domAnimation}>
      <main className="relative h-dvh overflow-hidden bg-background">
        <TechAmbientBackdrop />
        <DvdBounceLogo />

        <div className="pointer-events-none relative z-10 flex h-full flex-col items-center justify-center px-4 sm:px-6">
          <m.div className="mx-auto max-w-xl text-center" {...fadeUp(0)}>
            <p className="font-sans text-[5.5rem] font-bold leading-none tracking-tight text-primary sm:text-[7rem]">
              {code}
            </p>

            <h1 className="mt-4 font-sans text-2xl font-semibold text-on-dark sm:text-3xl">
              {title}
            </h1>

            <p className="prose-width mx-auto mt-4 text-base leading-relaxed text-muted-on-dark sm:text-lg">
              {description}
            </p>

            <p className="mt-3 text-sm text-muted-on-dark/75">{playHint}</p>

            <div className="mt-10 flex justify-center">
              <MarketingButton asChild size="lg" className="pointer-events-auto px-8">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </MarketingButton>
            </div>
          </m.div>
        </div>
      </main>
    </LazyMotion>
  )
}
