import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

type QuickLinkCardProps = {
  href: string
  label: string
  description: string
  icon: LucideIcon
}

export function QuickLinkCard({
  href,
  label,
  description,
  icon: Icon,
}: QuickLinkCardProps) {
  return (
    <Link
      href={href}
      className="flex min-h-11 items-start gap-3 rounded-xl border border-agua/30 bg-card/60 p-4 transition-colors hover:border-primary/50 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
      <span>
        <span className="block font-sans font-medium text-foreground">{label}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
      </span>
    </Link>
  )
}
