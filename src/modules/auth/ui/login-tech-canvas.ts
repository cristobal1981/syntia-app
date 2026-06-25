export type NetworkParticle = {
  homeX: number
  homeY: number
  x: number
  y: number
  radius: number
  phase: number
}

export type NetworkPulse = {
  fromIndex: number
  toIndex: number
  progress: number
  speed: number
}

const PRIMARY = { r: 1, g: 222, b: 162 }
const TURQUESA = { r: 43, g: 192, b: 169 }
const LINK_DISTANCE = 148
const DRIFT_AMPLITUDE = 16

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function flowNoise(x: number, y: number, time: number) {
  return (
    Math.sin(x * 0.9 + time) * 0.5 +
    Math.sin(y * 1.1 - time * 0.8) * 0.35 +
    Math.sin((x + y) * 0.55 + time * 0.6) * 0.25
  )
}

export function createParticles(
  width: number,
  height: number,
  density: number
): NetworkParticle[] {
  const area = (width * height) / 10000
  const count = clamp(Math.floor(area * density), 48, 110)

  return Array.from({ length: count }, () => {
    const homeX = Math.random() * width
    const homeY = Math.random() * height

    return {
      homeX,
      homeY,
      x: homeX,
      y: homeY,
      radius: Math.random() * 1.2 + 0.8,
      phase: Math.random() * Math.PI * 2,
    }
  })
}

export function spawnPulse(particles: NetworkParticle[]): NetworkPulse | null {
  if (particles.length < 2) return null

  const fromIndex = Math.floor(Math.random() * particles.length)
  const from = particles[fromIndex]

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const toIndex = Math.floor(Math.random() * particles.length)
    const to = particles[toIndex]
    const dist = Math.hypot(to.x - from.x, to.y - from.y)
    if (toIndex !== fromIndex && dist < LINK_DISTANCE) {
      return {
        fromIndex,
        toIndex,
        progress: 0,
        speed: 0.012 + Math.random() * 0.018,
      }
    }
  }

  return null
}

const CURSOR_RADIUS = 132
const CURSOR_PULL = 0.42

export function applyCursorInfluence(
  particles: NetworkParticle[],
  cursor: { x: number; y: number } | null
) {
  if (!cursor) return

  for (const particle of particles) {
    const dx = cursor.x - particle.x
    const dy = cursor.y - particle.y
    const dist = Math.hypot(dx, dy)
    if (dist > CURSOR_RADIUS || dist < 2) continue

    const pull = (1 - dist / CURSOR_RADIUS) * CURSOR_PULL
    particle.x += dx * pull * 0.12
    particle.y += dy * pull * 0.12
  }
}

export function applyCursorRepel(
  particles: NetworkParticle[],
  cursor: { x: number; y: number } | null
) {
  if (!cursor) return

  for (const particle of particles) {
    const dx = particle.x - cursor.x
    const dy = particle.y - cursor.y
    const dist = Math.hypot(dx, dy)
    if (dist > CURSOR_RADIUS || dist < 2) continue

    const push = (1 - dist / CURSOR_RADIUS) * CURSOR_PULL
    particle.x += (dx / dist) * push * 14
    particle.y += (dy / dist) * push * 14
  }
}

export function applyNetworkGlitch(particles: NetworkParticle[], time: number) {
  const spike = Math.sin(time * 0.002) * Math.sin(time * 0.0007)
  if (spike < 0.82) return

  for (const particle of particles) {
    particle.x += (Math.random() - 0.5) * 6
    particle.y += (Math.random() - 0.5) * 6
  }
}

export function spawnPulsesFromPoint(
  particles: NetworkParticle[],
  x: number,
  y: number,
  maxPulses = 5
): NetworkPulse[] {
  if (particles.length < 2) return []

  const ranked = particles
    .map((particle, index) => ({
      index,
      dist: Math.hypot(particle.x - x, particle.y - y),
    }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4)

  const pulses: NetworkPulse[] = []
  const seen = new Set<string>()

  for (const origin of ranked) {
    for (let index = 0; index < particles.length; index += 1) {
      if (index === origin.index) continue

      const target = particles[index]
      const originParticle = particles[origin.index]
      const dist = Math.hypot(target.x - originParticle.x, target.y - originParticle.y)
      if (dist > LINK_DISTANCE) continue

      const key = `${origin.index}-${index}`
      if (seen.has(key)) continue
      seen.add(key)

      pulses.push({
        fromIndex: origin.index,
        toIndex: index,
        progress: 0,
        speed: 0.018 + Math.random() * 0.022,
      })

      if (pulses.length >= maxPulses) return pulses
    }
  }

  return pulses
}

export type DrawNetworkOptions = {
  width: number
  height: number
  particles: NetworkParticle[]
  pulses: NetworkPulse[]
  time: number
}

export function updateNetwork(
  particles: NetworkParticle[],
  time: number
) {
  const t = time * 0.00035

  for (const particle of particles) {
    const driftX =
      flowNoise(particle.homeX * 0.0028, particle.homeY * 0.002, t) * DRIFT_AMPLITUDE
    const driftY =
      flowNoise(particle.homeY * 0.0028, particle.homeX * 0.002 + 42, t + 2) *
      DRIFT_AMPLITUDE

    particle.x = particle.homeX + driftX
    particle.y = particle.homeY + driftY
    particle.phase += 0.02
  }
}

export function drawNetwork(
  ctx: CanvasRenderingContext2D,
  options: DrawNetworkOptions
) {
  const { width, height, particles, pulses, time } = options

  ctx.clearRect(0, 0, width, height)

  for (let i = 0; i < particles.length; i += 1) {
    for (let j = i + 1; j < particles.length; j += 1) {
      const a = particles[i]
      const b = particles[j]
      const dist = Math.hypot(b.x - a.x, b.y - a.y)
      if (dist > LINK_DISTANCE) continue

      const strength = 1 - dist / LINK_DISTANCE
      const alpha = strength * 0.16

      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.strokeStyle = `rgba(${TURQUESA.r}, ${TURQUESA.g}, ${TURQUESA.b}, ${alpha})`
      ctx.lineWidth = 1.15
      ctx.stroke()
    }
  }

  for (const pulse of pulses) {
    const from = particles[pulse.fromIndex]
    const to = particles[pulse.toIndex]
    if (!from || !to) continue

    const x = lerp(from.x, to.x, pulse.progress)
    const y = lerp(from.y, to.y, pulse.progress)

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 10)
    gradient.addColorStop(0, `rgba(${PRIMARY.r}, ${PRIMARY.g}, ${PRIMARY.b}, 0.45)`)
    gradient.addColorStop(1, `rgba(${PRIMARY.r}, ${PRIMARY.g}, ${PRIMARY.b}, 0)`)

    ctx.beginPath()
    ctx.fillStyle = gradient
    ctx.arc(x, y, 10, 0, Math.PI * 2)
    ctx.fill()
  }

  for (const particle of particles) {
    const glow = 0.22 + Math.sin(particle.phase) * 0.08
    const gradient = ctx.createRadialGradient(
      particle.x,
      particle.y,
      0,
      particle.x,
      particle.y,
      particle.radius * 4
    )
    gradient.addColorStop(0, `rgba(${PRIMARY.r}, ${PRIMARY.g}, ${PRIMARY.b}, ${glow})`)
    gradient.addColorStop(1, `rgba(${PRIMARY.r}, ${PRIMARY.g}, ${PRIMARY.b}, 0)`)

    ctx.beginPath()
    ctx.fillStyle = gradient
    ctx.arc(particle.x, particle.y, particle.radius * 4, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.fillStyle = `rgba(${PRIMARY.r}, ${PRIMARY.g}, ${PRIMARY.b}, 0.58)`
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const sweepX = ((time * 0.04) % (width + 240)) - 120
  const sweep = ctx.createLinearGradient(sweepX, 0, sweepX + 180, height)
  sweep.addColorStop(0, 'rgba(1, 222, 162, 0)')
  sweep.addColorStop(0.5, 'rgba(1, 222, 162, 0.012)')
  sweep.addColorStop(1, 'rgba(1, 222, 162, 0)')
  ctx.fillStyle = sweep
  ctx.fillRect(0, 0, width, height)
}
