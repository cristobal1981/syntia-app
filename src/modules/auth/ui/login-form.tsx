'use client'

import Link from 'next/link'
import { LazyMotion, AnimatePresence, domAnimation, m } from 'framer-motion'
import { useActionState } from 'react'

import { portal } from '@/content/portal'
import { Input } from '@/components/ui/input'
import { MarketingButton } from '@/components/ui/marketing-button'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import {
  signInAction,
  type SignInResult,
} from '@/src/modules/auth/application/sign-in'
import { GoogleSignInButton } from '@/src/modules/auth/ui/google-sign-in-button'

export function LoginForm() {
  const reducedMotion = usePrefersReducedMotion()
  const [state, formAction, pending] = useActionState<SignInResult | null, FormData>(
    signInAction,
    null
  )
  const errorMessage =
    state && !state.ok ? portal.login.errors[state.error] : null

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex flex-col gap-6">
      <form action={formAction} className="flex flex-col gap-6" noValidate>
        <m.div
          className="flex flex-col gap-2"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <label
            htmlFor="email"
            className="text-xs font-medium tracking-wide text-muted-on-dark uppercase"
          >
            {portal.login.emailLabel}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input-on-dark h-12 rounded-lg border-agua/25 bg-on-dark/5 text-base transition-[border-color,box-shadow] duration-200 focus-visible:border-primary/60 focus-visible:shadow-[0_0_0_1px_rgba(1,222,162,0.25)]"
            aria-invalid={Boolean(errorMessage)}
          />
        </m.div>

        <m.div
          className="flex flex-col gap-2"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.26, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center justify-between gap-3">
            <label
              htmlFor="password"
              className="text-xs font-medium tracking-wide text-muted-on-dark uppercase"
            >
              {portal.login.passwordLabel}
            </label>
            <Link
              href="/login/recuperar"
              className="text-xs text-primary transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {portal.login.forgotPasswordLabel}
            </Link>
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="input-on-dark h-12 rounded-lg border-agua/25 bg-on-dark/5 text-base transition-[border-color,box-shadow] duration-200 focus-visible:border-primary/60 focus-visible:shadow-[0_0_0_1px_rgba(1,222,162,0.25)]"
            aria-invalid={Boolean(errorMessage)}
          />
        </m.div>

        <AnimatePresence mode="wait">
          {errorMessage ? (
            <m.p
              key="login-error"
              role="alert"
              aria-live="polite"
              className="alert-on-dark"
              initial={reducedMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              {errorMessage}
            </m.p>
          ) : null}
        </AnimatePresence>

        <m.div
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.34, ease: [0.22, 1, 0.36, 1] }}
        >
          <MarketingButton
            type="submit"
            marketingVariant="primary"
            className="h-12 w-full rounded-lg text-base font-semibold tracking-wide"
            disabled={pending}
          >
            {pending ? 'Entrando…' : portal.login.submitLabel}
          </MarketingButton>
        </m.div>
      </form>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-agua/25" />
        <span className="text-xs tracking-wide text-muted-on-dark uppercase">
          {portal.login.orDivider}
        </span>
        <div className="h-px flex-1 bg-agua/25" />
      </div>

      <GoogleSignInButton />
      </div>
    </LazyMotion>
  )
}
