import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type QuickLinkCardProps = {
  href: string
  label: string
  icon: LucideIcon
}

export function QuickLinkCard({ href, label, icon: Icon }: QuickLinkCardProps) {
  return (
    <Link
      href={href}
      className="flex min-h-9 items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="font-sans text-sm font-medium text-foreground">{label}</span>
    </Link>
  )
}
