'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import {
  createParticles,
  drawNetwork,
  spawnPulse,
  updateNetwork,
  type NetworkParticle,
  type NetworkPulse,
} from '@/src/modules/auth/ui/login-tech-canvas'

export function LoginAmbientBackdrop() {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = usePrefersReducedMotion()

  useLayoutEffect(() => {
    const root = rootRef.current
    const canvas = canvasRef.current
    if (!root || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let frameId = 0
    let particles: NetworkParticle[] = []
    let pulses: NetworkPulse[] = []
    let width = 0
    let height = 0
    let dpr = 1
    let running = true
    let pulseTimer = 0

    const resize = () => {
      const rect = root.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = createParticles(width, height, 0.72)
    }

    resize()
    window.addEventListener('resize', resize)

    if (!reducedMotion) {
      gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' })

      const tick = (time: number) => {
        if (!running) return

        updateNetwork(particles, time)

        pulseTimer += 1
        if (pulseTimer > 42 && pulses.length < 3) {
          const pulse = spawnPulse(particles)
          if (pulse) pulses.push(pulse)
          pulseTimer = 0
        }

        pulses = pulses
          .map((pulse) => ({ ...pulse, progress: pulse.progress + pulse.speed }))
          .filter((pulse) => pulse.progress <= 1)

        drawNetwork(ctx, { width, height, particles, pulses, time })
        frameId = window.requestAnimationFrame(tick)
      }

      frameId = window.requestAnimationFrame(tick)
    } else {
      drawNetwork(ctx, {
        width,
        height,
        particles: createParticles(width, height, 0.65),
        pulses: [],
        time: 0,
      })
    }

    return () => {
      running = false
      window.cancelAnimationFrame(frameId)
      window.removeEventListener('resize', resize)
    }
  }, [reducedMotion])

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="login-tech-mesh absolute inset-0" />

      <div className="login-tech-grid absolute inset-0 opacity-25" />

      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full opacity-[0.68]" />

      <div className="login-tech-scan absolute inset-0 opacity-15" />

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 72% 38%, rgba(1,222,162,0.025) 0%, transparent 65%)',
        }}
      />

      <div className="login-tech-dim absolute inset-0" />

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 90% at 50% 100%, rgba(3,10,12,0.96) 0%, transparent 62%)',
        }}
      />
    </div>
  )
}
