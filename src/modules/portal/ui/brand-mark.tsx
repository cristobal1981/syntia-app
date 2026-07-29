type BrandMarkProps = {
  path: string
  title: string
  className?: string
}

export function BrandMark({ path, title, className }: BrandMarkProps) {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label={title} className={className}>
      <path d={path} fill="currentColor" />
    </svg>
  )
}
