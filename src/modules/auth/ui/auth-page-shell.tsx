'use client'

import Image from 'next/image'
import Link from 'next/link'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import type { ReactNode } from 'react'

import { site } from '@/content/site'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import { LoginAmbientBackdrop } from '@/src/modules/auth/ui/login-ambient-backdrop'

const landingUrl = process.env.NEXT_PUBLIC_LANDING_URL ?? '/proximamente'
const easeOut = [0.22, 1, 0.36, 1] as const

type AuthPageShellProps = {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
  logoHref?: string
}

export function AuthPageShell({
  title,
  description,
  children,
  footer,
  logoHref = '/login',
}: AuthPageShellProps) {
  const reducedMotion = usePrefersReducedMotion()

  const fadeUp = (delay = 0) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.65, delay, ease: easeOut },
        }

  return (
    <LazyMotion features={domAnimation}>
      <main className="relative min-h-dvh overflow-hidden bg-background">
        <LoginAmbientBackdrop />

        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:gap-16 lg:px-8 lg:py-0">
          <m.section
            className="flex flex-1 flex-col justify-center lg:max-w-md lg:py-16"
            {...fadeUp(0)}
          >
            <Link
              href={logoHref}
              className="mb-10 inline-flex w-fit focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <Image
                src={site.brand.logoHorizontalNegativo}
                alt="Syntia"
                width={220}
                height={48}
                priority
                className="h-9 w-auto sm:h-11"
              />
            </Link>

            <h1 className="font-sans text-3xl font-semibold tracking-tight text-on-dark sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
              {title}
            </h1>

            <p className="mt-4 max-w-sm text-base leading-relaxed text-muted-on-dark sm:text-lg">
              {description}
            </p>

            <div className="mt-8 hidden h-px w-16 bg-primary/70 lg:block" />

            <p className="mt-8 hidden max-w-xs text-sm leading-relaxed text-muted-on-dark/80 lg:block">
              {site.brand.claim}
            </p>
          </m.section>

          <m.section
            className="flex w-full flex-1 flex-col justify-center lg:max-w-md lg:py-16"
            {...fadeUp(reducedMotion ? 0 : 0.12)}
          >
            {children}

            <m.p
              className="mt-6 text-center text-sm text-muted-on-dark lg:text-left"
              {...fadeUp(reducedMotion ? 0 : 0.28)}
            >
              {footer ?? (
                <Link
                  href={landingUrl}
                  className="underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  Volver al sitio
                </Link>
              )}
            </m.p>
          </m.section>
        </div>
      </main>
    </LazyMotion>
  )
}
