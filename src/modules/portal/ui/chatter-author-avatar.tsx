'use client'

import { useEffect, useRef, useState } from 'react'

import { Skeleton } from '@/components/ui/skeleton'
import { portalChatter } from '@/content/portal-chatter'
import { cn } from '@/lib/utils'
import { getPartnerAvatarUrl } from '@/src/modules/portal/lib/partner-avatar-url'

type ChatterAuthorAvatarProps = {
  name: string
  partnerId: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
  priority?: boolean
}

type AvatarLoadStatus = 'loading' | 'loaded' | 'failed'

const AVATAR_SIZE = {
  sm: { box: 'size-8', text: 'text-xs', px: 32 },
  md: { box: 'size-10', text: 'text-sm', px: 40 },
  lg: { box: 'size-12', text: 'text-base', px: 48 },
} as const

function authorInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export function ChatterAuthorAvatar({
  name,
  partnerId,
  className,
  size = 'sm',
  priority = false,
}: ChatterAuthorAvatarProps) {
  const [status, setStatus] = useState<AvatarLoadStatus>('loading')
  const imgRef = useRef<HTMLImageElement>(null)
  const initial = authorInitial(name)
  const dimensions = AVATAR_SIZE[size]

  useEffect(() => {
    setStatus('loading')
  }, [partnerId])

  useEffect(() => {
    const img = imgRef.current
    if (img?.complete && img.naturalWidth > 0) {
      setStatus('loaded')
    }
  }, [partnerId])

  if (status === 'failed') {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary',
          dimensions.box,
          dimensions.text,
          className
        )}
        aria-hidden
      >
        {initial}
      </span>
    )
  }

  return (
    <span
      className={cn('relative block shrink-0', dimensions.box, className)}
      aria-busy={status === 'loading' || undefined}
    >
      {status === 'loading' ? (
        <>
          <Skeleton className={cn('rounded-full', dimensions.box)} aria-hidden />
          <span className="sr-only">
            {portalChatter.authorAvatarLoading.replace('{name}', name)}
          </span>
        </>
      ) : null}
      <img
        ref={imgRef}
        src={getPartnerAvatarUrl(partnerId)}
        alt={portalChatter.authorAvatarAlt.replace('{name}', name)}
        width={dimensions.px}
        height={dimensions.px}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        className={cn(
          'rounded-full object-cover',
          dimensions.box,
          status === 'loading' &&
            'pointer-events-none absolute inset-0 opacity-0'
        )}
        onLoad={() => setStatus('loaded')}
        onError={() => setStatus('failed')}
      />
    </span>
  )
}
