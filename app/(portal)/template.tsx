'use client'

import { LazyMotion, domAnimation, m } from 'framer-motion'

import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'

const menuEase = [0.22, 1, 0.36, 1] as const

type PortalTemplateProps = {
  children: React.ReactNode
}

export default function PortalTemplate({ children }: PortalTemplateProps) {
  const reducedMotion = usePrefersReducedMotion()

  if (reducedMotion) {
    return <>{children}</>
  }

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: menuEase }}
      >
        {children}
      </m.div>
    </LazyMotion>
  )
}
