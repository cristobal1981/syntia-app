'use client'

import { useEffect, useId, useRef } from 'react'

import './sappo.css'
import {
  SAPPO_BODY,
  SAPPO_GROUP_TRANSFORM,
  SAPPO_LEG_LEFT,
  SAPPO_LEG_RIGHT,
} from '@/components/errors/sappo-geometry'
import type { SappoMood } from '@/content/errors'

const VIEW_BOX = { x: 58, y: 20, w: 384, h: 416 } as const
const EYES = [
  { id: 'l', cx: 165.5, cy: 120 },
  { id: 'r', cx: 324, cy: 120 },
] as const
const EYE_R = 50.5
const PUPIL_R = 21
const PUPIL_TRAVEL = 22

const INK = 'var(--surface-dark)'
const SCLERA = 'var(--brisa)'

/** Espiral de Arquímedes para los ojos mareados. */
function spiralPath(radius: number, turns: number) {
  const steps = turns * 28
  const points: string[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const angle = t * turns * Math.PI * 2
    const r = t * radius
    points.push(`${(Math.cos(angle) * r).toFixed(1)} ${(Math.sin(angle) * r).toFixed(1)}`)
  }
  return `M ${points.join(' L ')}`
}
const SPIRAL = spiralPath(36, 2.6)

/** Párpado fijo por ojo: 0 = abierto, 1 = cerrado del todo. */
function restingLid(mood: SappoMood, eye: 'l' | 'r') {
  if (mood === 'sleepy') return 1
  if (mood === 'confused' && eye === 'r') return 0.5
  return 0
}

function useGaze(svgRef: React.RefObject<SVGSVGElement | null>, wanderFast: boolean) {
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const pupils = Array.from(svg.querySelectorAll<SVGGElement>('[data-pupil]'))
    if (pupils.length === 0) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let lastPointer = 0

    const lookAt = (clientX: number, clientY: number) => {
      const rect = svg.getBoundingClientRect()
      const k = rect.width / VIEW_BOX.w
      for (const pupil of pupils) {
        const eyeX = rect.left + (Number(pupil.dataset.cx) - VIEW_BOX.x) * k
        const eyeY = rect.top + (Number(pupil.dataset.cy) - VIEW_BOX.y) * k
        const dx = clientX - eyeX
        const dy = clientY - eyeY
        const dist = Math.hypot(dx, dy) || 1
        const pull = Math.min(1, dist / (k * 90)) * PUPIL_TRAVEL
        pupil.style.transform = `translate(${(dx / dist) * pull}px, ${(dy / dist) * pull}px)`
      }
    }

    const onPointer = (event: PointerEvent) => {
      lastPointer = performance.now()
      lookAt(event.clientX, event.clientY)
    }
    window.addEventListener('pointermove', onPointer, { passive: true })
    window.addEventListener('pointerdown', onPointer, { passive: true })

    let wander: ReturnType<typeof setInterval> | undefined
    if (!reduced) {
      const glance = () => {
        if (performance.now() - lastPointer < 2800) return
        const angle = Math.random() * Math.PI * 2
        const pull = (0.45 + Math.random() * 0.55) * PUPIL_TRAVEL
        for (const pupil of pupils) {
          pupil.style.transform = `translate(${Math.cos(angle) * pull}px, ${Math.sin(angle) * pull * 0.6}px)`
        }
      }
      wander = setInterval(glance, wanderFast ? 1100 : 2000)
    }

    return () => {
      window.removeEventListener('pointermove', onPointer)
      window.removeEventListener('pointerdown', onPointer)
      if (wander) clearInterval(wander)
    }
  }, [svgRef, wanderFast])
}

type SappoProps = {
  mood: SappoMood
  className?: string
}

export function Sappo({ mood, className }: SappoProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const uid = useId()
  useGaze(svgRef, mood === 'lost')

  const eyesShowPupil = mood !== 'dizzy' && mood !== 'guard'

  return (
    <svg
      ref={svgRef}
      viewBox={`${VIEW_BOX.x} ${VIEW_BOX.y} ${VIEW_BOX.w} ${VIEW_BOX.h}`}
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        {EYES.map((eye) => (
          <clipPath key={eye.id} id={`${uid}-eye-${eye.id}`}>
            <circle cx={eye.cx} cy={eye.cy} r={EYE_R} />
          </clipPath>
        ))}
      </defs>

      <g className="sappo-body" data-mood={mood}>
        <g transform={SAPPO_GROUP_TRANSFORM} style={{ fill: 'var(--primary)' }}>
          <path d={SAPPO_BODY.d} transform={SAPPO_BODY.transform} />
          <path d={SAPPO_LEG_LEFT.d} transform={SAPPO_LEG_LEFT.transform} />
          <path d={SAPPO_LEG_RIGHT.d} transform={SAPPO_LEG_RIGHT.transform} />
        </g>

        <ellipse cx={241} cy={183} rx={3.8} ry={2.6} fill={INK} />
        <ellipse cx={257} cy={183} rx={3.8} ry={2.6} fill={INK} />

        {EYES.map((eye) => {
          const resting = restingLid(mood, eye.id)
          return (
            <g key={eye.id}>
              <circle cx={eye.cx} cy={eye.cy} r={EYE_R} fill={SCLERA} />

              {mood === 'dizzy' ? (
                <g transform={`translate(${eye.cx} ${eye.cy})`}>
                  <path
                    d={SPIRAL}
                    className="sappo-spiral"
                    data-eye={eye.id}
                    fill="none"
                    stroke={INK}
                    strokeWidth={6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              ) : null}

              {eyesShowPupil ? (
                <g
                  data-pupil
                  data-cx={eye.cx}
                  data-cy={eye.cy}
                  className="sappo-pupil"
                >
                  <circle cx={eye.cx} cy={eye.cy} r={PUPIL_R} fill={INK} />
                  <circle cx={eye.cx + 8} cy={eye.cy - 8} r={6.5} fill={SCLERA} />
                </g>
              ) : null}

              <g clipPath={`url(#${uid}-eye-${eye.id})`}>
                <rect
                  className={resting === 0 ? 'sappo-lid' : undefined}
                  data-eye={eye.id}
                  x={eye.cx - EYE_R - 1}
                  y={eye.cy - EYE_R - 1}
                  width={EYE_R * 2 + 2}
                  height={EYE_R * 2 + 2}
                  fill="var(--primary)"
                  style={
                    resting === 0
                      ? undefined
                      : {
                          transformBox: 'fill-box',
                          transformOrigin: '50% 0',
                          transform: `scaleY(${resting})`,
                        }
                  }
                />
              </g>

              {mood === 'sleepy' ? (
                <path
                  d={`M ${eye.cx - 30} ${eye.cy - 2} Q ${eye.cx} ${eye.cy + 24} ${eye.cx + 30} ${eye.cy - 2}`}
                  fill="none"
                  stroke={INK}
                  strokeWidth={6}
                  strokeLinecap="round"
                />
              ) : null}
            </g>
          )
        })}

        {mood === 'guard' ? <Sunglasses /> : null}
        {mood === 'builder' ? <HardHat /> : null}
      </g>

      {mood === 'dizzy' ? (
        <g style={{ fill: 'var(--service-contable)' }}>
          <path
            className="sappo-drop"
            d="M 92 96 q -9 15 0 22 q 9 -7 0 -22 z"
          />
          <path
            className="sappo-drop"
            data-n="2"
            d="M 404 80 q -9 15 0 22 q 9 -7 0 -22 z"
          />
        </g>
      ) : null}

      {mood === 'sleepy' ? (
        <g style={{ fill: 'var(--brisa)' }} fontFamily="inherit">
          <text className="sappo-zzz" x={392} y={78} fontSize={42}>
            Z
          </text>
          <text className="sappo-zzz" data-n="2" x={412} y={52} fontSize={32}>
            Z
          </text>
          <text className="sappo-zzz" data-n="3" x={428} y={32} fontSize={24}>
            Z
          </text>
        </g>
      ) : null}
    </svg>
  )
}

function Sunglasses() {
  const lens = 'var(--surface-dark)'
  return (
    <g>
      {EYES.map((eye) => (
        <g key={eye.id}>
          <rect
            x={eye.cx - 58}
            y={eye.cy - 32}
            width={116}
            height={68}
            rx={26}
            fill={lens}
            stroke="var(--agua)"
            strokeWidth={3}
          />
          <path
            d={`M ${eye.cx - 34} ${eye.cy - 8} L ${eye.cx - 10} ${eye.cy - 24} M ${eye.cx - 20} ${eye.cy + 6} L ${eye.cx + 6} ${eye.cy - 14}`}
            stroke="var(--primary)"
            strokeOpacity={0.55}
            strokeWidth={5}
            strokeLinecap="round"
          />
        </g>
      ))}
      <rect x={218} y={EYES[0].cy - 14} width={54} height={9} rx={4} fill={lens} />
    </g>
  )
}

function HardHat() {
  const hat = 'var(--service-fiscal)'
  const shade = 'color-mix(in oklch, var(--service-fiscal) 72%, var(--surface-dark))'
  return (
    <g>
      <path d="M 128 84 C 128 18, 362 18, 362 84 Z" fill={hat} />
      <path d="M 226 28 L 264 28 L 266 84 L 224 84 Z" fill={shade} />
      <rect x={106} y={78} width={278} height={16} rx={8} fill={hat} />
      <rect x={106} y={88} width={278} height={6} rx={3} fill={shade} />
    </g>
  )
}
