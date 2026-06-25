import type { ComponentProps, ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'

import { cn } from '@/lib/utils'

function isExternalHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test(href)
}

export const appLinkClassName =
  'group/app-link inline-flex cursor-pointer items-center gap-1 font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export const appLinkPortalClassName =
  'text-agua underline decoration-agua/50 hover:decoration-agua dark:text-turquesa dark:decoration-turquesa/50 dark:hover:decoration-turquesa'

export const appLinkArrowClassName =
  'size-3.5 shrink-0 opacity-80 transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none group-hover/app-link:translate-x-px group-hover/app-link:-translate-y-px group-hover/app-link:opacity-100'

type AppLinkProps = {
  href: string
  children: ReactNode
  className?: string
  arrowClassName?: string
  showArrow?: boolean
  external?: boolean
} & Pick<ComponentProps<'a'>, 'aria-label' | 'title'>

export function AppLink({
  href,
  children,
  className,
  arrowClassName,
  showArrow = true,
  external,
  'aria-label': ariaLabel,
  title,
}: AppLinkProps) {
  const isExternal = external ?? isExternalHref(href)

  const content = (
    <>
      <span>{children}</span>
      {showArrow ? (
        <ArrowUpRight
          className={cn(appLinkArrowClassName, arrowClassName)}
          aria-hidden
        />
      ) : null}
      {isExternal ? (
        <span className="sr-only"> (se abre en una pestaña nueva)</span>
      ) : null}
    </>
  )

  const classes = cn(appLinkClassName, className)

  if (isExternal) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        title={title}
      >
        {content}
      </a>
    )
  }

  return (
    <Link href={href} className={classes} aria-label={ariaLabel} title={title}>
      {content}
    </Link>
  )
}
