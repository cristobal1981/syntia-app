'use client'

import { useLayoutEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

const LOGO_PATH_TOP =
  'M241.81,1L1,241.83c-.64.64-1,1.51-1,2.42v116.58c0,1.89,1.53,3.42,3.42,3.42h116.56c.9,0,1.74-.34,2.39-.97,9.94-9.8,92.54-91.29,115.07-114.67,2.09-2.17.54-5.79-2.48-5.79h-107.72c-3.05,0-4.58-3.69-2.42-5.85l114.57-114.57c.64-.64,1.51-1,2.42-1h121c.91,0,1.78-.36,2.42-1L479.8,5.85c2.16-2.16.63-5.85-2.42-5.85h-233.15c-.91,0-1.78.36-2.42,1Z'

const LOGO_PATH_BOTTOM =
  'M243.84,484.67l240.8-240.83c.64-.64,1-1.51,1-2.42v-116.58c0-1.89-1.53-3.42-3.42-3.42h-116.56c-.9,0-1.74.34-2.39.97-9.94,9.8-92.54,91.29-115.07,114.67-2.09,2.17-.54,5.79,2.48,5.79h107.72c3.05,0,4.58,3.69,2.42,5.85l-114.57,114.57c-.64.64-1.51,1-2.42,1h-121c-.91,0-1.78.36-2.42,1L5.85,479.83c-2.16,2.16-.63,5.85,2.42,5.85h233.15c.91,0,1.78-.36,2.42-1Z'

function measureBoltStroke(path: SVGPathElement) {
  const length = path.getTotalLength()
  path.style.setProperty('--syntia-bolt-len', String(length))
  path.style.strokeDasharray = String(length)
}

type SyntiaBoltLoaderProps = {
  size?: number
  className?: string
}

export function SyntiaBoltLoader({ size = 72, className }: SyntiaBoltLoaderProps) {
  const strokeTopRef = useRef<SVGPathElement>(null)
  const strokeBottomRef = useRef<SVGPathElement>(null)

  useLayoutEffect(() => {
    if (strokeTopRef.current) measureBoltStroke(strokeTopRef.current)
    if (strokeBottomRef.current) measureBoltStroke(strokeBottomRef.current)
  }, [])

  return (
    <svg
      width={size}
      height={size}
      viewBox="-6 -6 497.65 497.67"
      className={cn('overflow-visible', className)}
      aria-hidden
    >
      <path className="syntia-bolt-fill" d={LOGO_PATH_TOP} />
      <path className="syntia-bolt-fill" d={LOGO_PATH_BOTTOM} />
      <path ref={strokeTopRef} className="syntia-bolt-stroke" d={LOGO_PATH_TOP} />
      <path ref={strokeBottomRef} className="syntia-bolt-stroke" d={LOGO_PATH_BOTTOM} />
    </svg>
  )
}
