'use client'

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { LazyMotion, AnimatePresence, domAnimation, m } from 'framer-motion'
import { useActionState, useEffect } from 'react'

import { portal } from '@/content/portal'
import { Input } from '@/components/ui/input'
import { MarketingButton } from '@/components/ui/marketing-button'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import {
  signInAction,
  type SignInResult,
} from '@/src/modules/auth/application/sign-in'
import {
  authFieldClassName,
  authLabelClassName,
  authSubmitClassName,
} from '@/src/modules/auth/ui/auth-field-styles'
import { PasswordInput } from '@/src/modules/auth/ui/password-input'
import { markPortalEntryPending } from '@/src/modules/portal/ui/portal-entry-loading-context'

export function LoginForm() {
  const reducedMotion = usePrefersReducedMotion()
  const [state, formAction, pending] = useActionState<SignInResult | null, FormData>(
    signInAction,
    null
  )
  const errorMessage =
    state && !state.ok ? portal.login.errors[state.error] : null

  useEffect(() => {
    if (pending) {
      markPortalEntryPending()
    }
  }, [pending])

  return (
    <LazyMotion features={domAnimation}>
      <form action={formAction} className="flex flex-col gap-5" noValidate>
        <m.div
          className="flex flex-col gap-2"
          initial={reducedMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          <label
            htmlFor="email"
            className={authLabelClassName}
          >
            {portal.login.emailLabel}
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={authFieldClassName}
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
              className={authLabelClassName}
            >
              {portal.login.passwordLabel}
            </label>
            <Link
              href="/login/recuperar"
              className="rounded-sm text-sm text-primary underline-offset-4 transition-colors hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              {portal.login.forgotPasswordLabel}
            </Link>
          </div>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            className={authFieldClassName}
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
            className={authSubmitClassName}
            disabled={pending}
          >
            {pending ? 'Entrando…' : portal.login.submitLabel}
            {pending ? null : (
              <ArrowRight
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                aria-hidden
              />
            )}
          </MarketingButton>
        </m.div>
      </form>
    </LazyMotion>
  )
}
