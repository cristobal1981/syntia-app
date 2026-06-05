'use client'

import Image from 'next/image'
import { Roboto } from 'next/font/google'
import { useTransition } from 'react'

import { portal } from '@/content/portal'
import { signInWithGoogleAction } from '@/src/modules/auth/application/sign-in-with-google'
import { cn } from '@/lib/utils'

/**
 * Fallback Light theme manual (Google Branding Guidelines):
 * Fill #FFFFFF, stroke #747775, texto #1F1F1F Roboto Medium 14/20.
 */
const robotoMedium = Roboto({
  subsets: ['latin'],
  weight: '500',
  display: 'swap',
})

export function GoogleSignInButtonFallback() {
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signInWithGoogleAction())}
      className={cn(
        robotoMedium.className,
        'flex h-10 w-full items-center gap-3 overflow-hidden rounded border border-[#747775] bg-white px-3',
        'text-[14px] leading-5 font-medium text-[#1F1F1F]',
        'transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-70',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#747775]'
      )}
    >
      <Image
        src="/brand/google/g-logo.svg"
        alt=""
        width={18}
        height={18}
        className="shrink-0"
        aria-hidden
      />
      <span className="flex-1 text-center">
        {pending ? 'Redirigiendo…' : portal.login.googleLabel}
      </span>
    </button>
  )
}
