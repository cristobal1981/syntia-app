'use client'

import { useLayoutEffect, useRef } from 'react'

import { site } from '@/content/site'
import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'

const MARK_SIZE = 56
const SPEED = 200

export function DvdBounceLogo() {
  const arenaRef = useRef<HTMLDivElement>(null)
  const markRef = useRef<HTMLImageElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    if (reducedMotion) return

    const arena = arenaRef.current
    const mark = markRef.current
    if (!arena || !mark) return

    let x = 72
    let y = 88
    const angle = Math.PI * 0.09
    let vx = Math.cos(angle) * SPEED
    let vy = Math.sin(angle) * SPEED
    let frameId = 0
    let lastTime = 0
    let boundsW = 0
    let boundsH = 0
    let maxX = 0
    let maxY = 0
    let cornerFlashUntil = 0

    const measure = () => {
      const rect = arena.getBoundingClientRect()
      boundsW = rect.width
      boundsH = rect.height
      maxX = Math.max(0, boundsW - MARK_SIZE)
      maxY = Math.max(0, boundsH - MARK_SIZE)
      x = Math.min(Math.max(x, 0), maxX)
      y = Math.min(Math.max(y, 0), maxY)
    }

    const resolveCollisions = () => {
      let hitX = false
      let hitY = false

      if (x < 0) {
        x = -x
        vx = -vx
        hitX = true
      } else if (x > maxX) {
        x = maxX - (x - maxX)
        vx = -vx
        hitX = true
      }

      if (y < 0) {
        y = -y
        vy = -vy
        hitY = true
      } else if (y > maxY) {
        y = maxY - (y - maxY)
        vy = -vy
        hitY = true
      }

      return hitX && hitY
    }

    const tick = (now: number) => {
      if (!lastTime) lastTime = now
      let remaining = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now

      let cornerHit = false

      while (remaining > 0) {
        const step = Math.min(remaining, 1 / 120)
        remaining -= step

        x += vx * step
        y += vy * step

        if (resolveCollisions()) {
          cornerHit = true
        }
      }

      if (cornerHit) {
        cornerFlashUntil = now + 240
      }

      const cornerFlash = now < cornerFlashUntil
      mark.style.transform = `translate3d(${x}px, ${y}px, 0)`
      mark.style.opacity = cornerFlash ? '0.7' : '0.36'

      frameId = window.requestAnimationFrame(tick)
    }

    measure()

    const resizeObserver = new ResizeObserver(measure)
    resizeObserver.observe(arena)

    frameId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
    }
  }, [reducedMotion])

  if (reducedMotion) {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center"
        aria-hidden
      >
        <img
          src={site.brand.logoSrc}
          alt=""
          width={MARK_SIZE}
          height={MARK_SIZE}
          className="opacity-25"
          draggable={false}
        />
      </div>
    )
  }

  return (
    <div
      ref={arenaRef}
      className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
      aria-hidden
    >
      <img
        ref={markRef}
        src={site.brand.logoSrc}
        alt=""
        width={MARK_SIZE}
        height={MARK_SIZE}
        decoding="sync"
        draggable={false}
        className="dvd-bounce-mark absolute left-0 top-0 select-none"
      />
    </div>
  )
}
