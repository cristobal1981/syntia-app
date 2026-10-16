import Link from 'next/link'
import type { ReactNode } from 'react'

const LINK_CLASS =
  'cursor-pointer rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'

/** Texto que lleva a la ficha de una factura; sin destino, texto plano. */
export function InvoiceLink({ href, children }: { href?: string; children: ReactNode }) {
  if (!href) return <>{children}</>

  return (
    <Link href={href} className={LINK_CLASS}>
      {children}
    </Link>
  )
}
