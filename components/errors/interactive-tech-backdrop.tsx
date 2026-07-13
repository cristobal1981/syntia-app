'use client'

import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

import { usePrefersReducedMotion } from '@/lib/gsap/use-prefers-reduced-motion'
import {
  applyCursorInfluence,
  applyCursorRepel,
  applyNetworkGlitch,
  createParticles,
  drawNetwork,
  spawnPulse,
  spawnPulsesFromPoint,
  updateNetwork,
  type NetworkParticle,
  type NetworkPulse,
} from '@/src/modules/auth/ui/login-tech-canvas'

export type InteractiveTechVariant = 'attract' | 'repel' | 'overload'

type CursorPoint = {
  x: number
  y: number
}

const VARIANT_CONFIG: Record<
  InteractiveTechVariant,
  {
    ariaLabel: string
    cursorClass: string
    autoPulseInterval: number
    maxPulses: number
    clickBurst: number
  }
> = {
  attract: {
    ariaLabel:
      'Red de nodos interactiva. Mueve el cursor o pulsa para crear pulsos de luz.',
    cursorClass: 'cursor-crosshair',
    autoPulseInterval: 48,
    maxPulses: 12,
    clickBurst: 5,
  },
  repel: {
    ariaLabel:
      'Red de nodos interactiva. Acércate al cursor para apartar los nodos; pulsa para descargar.',
    cursorClass: 'cursor-cell',
    autoPulseInterval: 64,
    maxPulses: 8,
    clickBurst: 3,
  },
  overload: {
    ariaLabel:
      'Red inestable. Pulsa para enviar pulsos de reinicio mientras los servidores despiertan.',
    cursorClass: 'cursor-pointer',
    autoPulseInterval: 22,
    maxPulses: 16,
    clickBurst: 8,
  },
}

type InteractiveTechBackdropProps = {
  variant?: InteractiveTechVariant
}

export function InteractiveTechBackdrop({
  variant = 'attract',
}: InteractiveTechBackdropProps) {
  const config = VARIANT_CONFIG[variant]
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = usePrefersReducedMotion()
  const cursorRef = useRef<CursorPoint | null>(null)

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
    let time = 0

    const resize = () => {
      const rect = root.getBoundingClientRect()
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = createParticles(width, height, variant === 'overload' ? 0.82 : 0.78)
    }

    const setCursorFromClient = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      cursorRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
      }
    }

    const handlePointerMove = (event: PointerEvent) => {
      setCursorFromClient(event.clientX, event.clientY)
    }

    const handlePointerLeave = () => {
      cursorRef.current = null
    }

    const handlePointerDown = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      const burst = spawnPulsesFromPoint(particles, x, y, config.clickBurst)
      pulses = [...pulses, ...burst].slice(-config.maxPulses)
    }

    resize()
    window.addEventListener('resize', resize)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerleave', handlePointerLeave)
    canvas.addEventListener('pointerdown', handlePointerDown)

    if (!reducedMotion) {
      gsap.fromTo(canvas, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: 'power2.out' })

      const tick = (frameTime: number) => {
        if (!running) return

        time = frameTime
        updateNetwork(particles, time)

        if (variant === 'repel') {
          applyCursorRepel(particles, cursorRef.current)
        } else {
          applyCursorInfluence(particles, cursorRef.current)
        }

        if (variant === 'overload') {
          applyNetworkGlitch(particles, time)
        }

        pulseTimer += 1
        const maxAuto =
          variant === 'overload' ? 6 : variant === 'repel' ? 3 : 4
        if (pulseTimer > config.autoPulseInterval && pulses.length < maxAuto) {
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
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerleave', handlePointerLeave)
      canvas.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [config.autoPulseInterval, config.clickBurst, config.maxPulses, reducedMotion, variant])

  return (
    <div ref={rootRef} className="absolute inset-0 overflow-hidden">
      <div className="login-tech-mesh absolute inset-0" aria-hidden />
      <div className="login-tech-grid absolute inset-0 opacity-25" aria-hidden />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full touch-none opacity-[0.72] ${config.cursorClass}`}
        aria-label={config.ariaLabel}
      />
      <div
        className="login-tech-scan pointer-events-none absolute inset-0 opacity-15"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 72% 38%, rgba(1,222,162,0.03) 0%, transparent 65%)',
        }}
        aria-hidden
      />
      <div className="login-tech-dim pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 90% at 50% 100%, rgba(3,10,12,0.94) 0%, transparent 62%)',
        }}
        aria-hidden
      />
    </div>
  )
}
