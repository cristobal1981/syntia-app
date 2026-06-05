import Image from 'next/image'
import Link from 'next/link'

import { site } from '@/content/site'
import { cn } from '@/lib/utils'

type PortalBrandMarkProps = {
  href?: string
  collapsed?: boolean
  className?: string
  priority?: boolean
}

export function PortalBrandMark({
  href = '/dashboard',
  collapsed = false,
  className,
  priority = false,
}: PortalBrandMarkProps) {
  return (
    <Link
      href={href}
      className={cn('flex w-full items-center justify-center focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none', className)}
    >
      {collapsed ? (
        <Image
          src={site.brand.logoSrc}
          alt="Syntia"
          width={36}
          height={36}
          priority={priority}
          className="size-9 shrink-0"
        />
      ) : (
        <>
          <Image
            src={site.brand.logoHorizontalPositivo}
            alt="Syntia"
            width={180}
            height={40}
            priority={priority}
            className="h-8 w-auto max-w-full dark:hidden sm:h-9"
          />
          <Image
            src={site.brand.logoHorizontalNegativo}
            alt="Syntia"
            width={180}
            height={40}
            priority={priority}
            className="hidden h-8 w-auto max-w-full dark:block sm:h-9"
          />
        </>
      )}
    </Link>
  )
}
