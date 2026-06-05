import Image from 'next/image'
import Link from 'next/link'

import { site } from '@/content/site'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  className?: string
  href?: string
  priority?: boolean
  /** isotipo | horizontal — nunca wordmark tipográfico */
  variant?: 'isotipo' | 'horizontal'
}

export function BrandLogo({
  className,
  href = '/dashboard',
  priority = false,
  variant = 'isotipo',
}: BrandLogoProps) {
  return (
    <Link
      href={href}
      className={cn('inline-flex items-center justify-center focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none', className)}
    >
      {variant === 'isotipo' ? (
        <Image
          src={site.brand.logoSrc}
          alt="Syntia"
          width={40}
          height={40}
          priority={priority}
          className="h-8 w-8 shrink-0 sm:h-10 sm:w-10"
        />
      ) : (
        <>
          <Image
            src={site.brand.logoHorizontalPositivo}
            alt="Syntia"
            width={180}
            height={40}
            priority={priority}
            className="h-8 w-auto dark:hidden sm:h-9"
          />
          <Image
            src={site.brand.logoHorizontalNegativo}
            alt="Syntia"
            width={180}
            height={40}
            priority={priority}
            className="hidden h-8 w-auto dark:block sm:h-9"
          />
        </>
      )}
    </Link>
  )
}
