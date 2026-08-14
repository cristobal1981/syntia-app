import type { ComponentProps, ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, ArrowUpRight } from 'lucide-react'

import { cn } from '@/lib/utils'

function isExternalHref(href: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test(href)
}

export const appLinkClassName =
  'group/app-link inline-flex cursor-pointer items-center gap-1 font-medium text-primary underline-offset-4 transition-colors hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

export const appLinkPortalClassName =
  'text-agua underline decoration-agua/50 hover:decoration-agua dark:text-primary dark:decoration-primary/50 dark:hover:decoration-primary'

const appLinkArrowBaseClassName =
  'size-3.5 shrink-0 text-subtle-foreground transition-[transform,color] duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none group-hover/app-link:text-foreground'

/** Enlace externo: sale de la app. La flecha apunta en diagonal (↗). */
export const appLinkArrowExternalClassName = cn(
  appLinkArrowBaseClassName,
  'group-hover/app-link:translate-x-px group-hover/app-link:-translate-y-px'
)

/** Enlace interno: navega dentro de la app. La flecha apunta a la derecha (→). */
export const appLinkArrowInternalClassName = cn(
  appLinkArrowBaseClassName,
  'group-hover/app-link:translate-x-px'
)

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
  const ArrowIcon = isExternal ? ArrowUpRight : ArrowRight

  const content = (
    <>
      <span>{children}</span>
      {showArrow ? (
        <ArrowIcon
          className={cn(
            isExternal ? appLinkArrowExternalClassName : appLinkArrowInternalClassName,
            arrowClassName
          )}
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
