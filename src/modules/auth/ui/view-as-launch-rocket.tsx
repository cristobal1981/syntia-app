import { Sappo } from '@/components/errors/sappo'

/** Aletas, punta y franja del cohete: distinto del verde de Sappo para que se vea quién es quién. */
const ACCENT = 'color-mix(in oklch, var(--service-fiscal) 88%, var(--surface-dark))'

/**
 * Sappo con casco sentado encima de un cohete en diagonal (morro arriba a la derecha). El cohete es
 * un SVG propio dibujado en vertical y girado 45° por CSS; Sappo va aparte, derecho y algo inclinado
 * hacia delante, con los pies sobre el lomo del fuselaje. Las medidas están en porcentajes del
 * cuadrado del cohete (ver `view-as-launch.css`).
 */
export function ViewAsLaunchRocket() {
  return (
    <div className="va-rocket" aria-hidden>
      <svg className="va-rocket-body" viewBox="0 0 160 300" focusable="false">
        {/* Llama: tres capas para que parpadee con profundidad. */}
        <g className="va-flame">
          <path d="M 56 236 C 44 270, 70 290, 80 296 C 90 290, 116 270, 104 236 Z" fill="var(--service-fiscal)" />
          <path d="M 64 236 C 58 262, 74 278, 80 284 C 86 278, 102 262, 96 236 Z" fill="var(--turquesa)" opacity={0.95} />
          <path d="M 72 236 C 70 252, 77 262, 80 266 C 83 262, 90 252, 88 236 Z" fill="var(--brisa)" />
        </g>
        {/* Aletas, punta y franja en un tono cálido: el verde se queda para Sappo. */}
        <path d="M 46 190 L 14 244 L 14 262 L 56 238 Z" fill={ACCENT} />
        <path d="M 114 190 L 146 244 L 146 262 L 104 238 Z" fill={ACCENT} />
        {/* Fuselaje. */}
        <path
          d="M 80 6 C 118 40, 118 120, 112 238 L 48 238 C 42 120, 42 40, 80 6 Z"
          fill="var(--brisa)"
          stroke="var(--surface-dark)"
          strokeWidth={6}
          strokeLinejoin="round"
        />
        {/* Punta y franja. */}
        <path d="M 80 6 C 98 22, 106 40, 109 56 L 51 56 C 54 40, 62 22, 80 6 Z" fill={ACCENT} />
        <rect x={46} y={196} width={68} height={14} fill={ACCENT} />
        {/* Tobera. */}
        <path d="M 54 238 L 106 238 L 98 252 L 62 252 Z" fill="var(--surface-dark)" />
        {/* Ventana. */}
        <circle cx={80} cy={120} r={20} fill="var(--surface-dark)" />
        <circle cx={80} cy={120} r={14} fill="color-mix(in oklch, var(--turquesa) 55%, var(--brisa))" />
        <path d="M 72 114 C 74 109, 79 107, 83 108" fill="none" stroke="var(--brisa)" strokeWidth={3} strokeLinecap="round" />
      </svg>
      <Sappo mood="astronaut" className="va-rocket-sappo" />
    </div>
  )
}
