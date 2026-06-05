'use client'

import Link from 'next/link'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { useActionState } from 'react'

import { portal } from '@/content/portal'
import { Input } from '@/components/ui/input'
import { MarketingButton } from '@/components/ui/marketing-button'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import {
  requestPasswordResetAction,
  type RequestPasswordResetResult,
} from '@/src/modules/auth/application/request-password-reset'

export function RequestPasswordResetForm() {
  const reducedMotion = usePrefersReducedMotion()
  const [state, formAction, pending] = useActionState<
    RequestPasswordResetResult | null,
    FormData
  >(requestPasswordResetAction, null)

  const errorMessage =
    state && !state.ok ? portal.recovery.errors[state.error] : null
  const success = state?.ok === true

  return (
    <LazyMotion features={domAnimation}>
      <form action={formAction} className="flex flex-col gap-6" noValidate>
        {success ? (
          <m.p
            role="status"
            className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-3 text-sm leading-relaxed text-on-dark"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {portal.recovery.successMessage}
          </m.p>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="recovery-email"
                className="text-xs font-medium tracking-wide text-muted-on-dark uppercase"
              >
                {portal.recovery.emailLabel}
              </label>
              <Input
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-on-dark h-12 rounded-lg border-agua/25 bg-on-dark/5 text-base"
                aria-invalid={Boolean(errorMessage)}
              />
            </div>

            <AnimatePresence mode="wait">
              {errorMessage ? (
                <m.p
                  key="recovery-error"
                  role="alert"
                  className="alert-on-dark"
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {errorMessage}
                </m.p>
              ) : null}
            </AnimatePresence>

            <MarketingButton
              type="submit"
              marketingVariant="primary"
              className="h-12 w-full rounded-lg text-base font-semibold"
              disabled={pending}
            >
              {pending ? 'Enviando…' : portal.recovery.submitLabel}
            </MarketingButton>
          </>
        )}

        <p className="text-center text-sm text-muted-on-dark">
          <Link
            href="/login"
            className="text-primary underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            {portal.recovery.backToLoginLabel}
          </Link>
        </p>
      </form>
    </LazyMotion>
  )
}
