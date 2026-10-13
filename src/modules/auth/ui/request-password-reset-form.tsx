'use client'

import { ArrowLeft, MailCheck } from 'lucide-react'
import Link from 'next/link'
import { AnimatePresence, LazyMotion, domAnimation, m } from 'framer-motion'
import { useActionState } from 'react'

import { portal } from '@/content/portal'
import { Input } from '@/components/ui/input'
import { MarketingButton } from '@/components/ui/marketing-button'
import { usePrefersReducedMotion } from '@/lib/use-prefers-reduced-motion'
import {
  authFieldClassName,
  authLabelClassName,
  authSubmitClassName,
  authTextLinkClassName,
} from '@/src/modules/auth/ui/auth-field-styles'
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
      <form action={formAction} className="flex flex-col gap-5" noValidate>
        {success ? (
          <m.div
            role="status"
            className="flex items-start gap-4"
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary"
              aria-hidden
            >
              <MailCheck className="size-5" strokeWidth={1.75} />
            </span>
            <p className="pt-0.5 text-base leading-relaxed text-on-dark">
              {portal.recovery.successMessage}
            </p>
          </m.div>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <label
                htmlFor="recovery-email"
                className={authLabelClassName}
              >
                {portal.recovery.emailLabel}
              </label>
              <Input
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={authFieldClassName}
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
              className={authSubmitClassName}
              disabled={pending}
            >
              {pending ? 'Enviando…' : portal.recovery.submitLabel}
            </MarketingButton>
          </>
        )}

        <Link href="/login" className={authTextLinkClassName + ' w-fit'}>
          <ArrowLeft className="size-4" aria-hidden />
          {portal.recovery.backToLoginLabel}
        </Link>
      </form>
    </LazyMotion>
  )
}
