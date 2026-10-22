import { timingSafeEqualStrings } from '@/lib/security/timing-safe-equal'

/**
 * ¿Trae la petición `Authorization: Bearer <secreto>` con el secreto de esa
 * variable de entorno? Sin la variable configurada nunca se autoriza (se deja
 * constancia en el log, sin el valor).
 */
export function hasBearerSecret(request: Request, envName: string, label: string): boolean {
  const secret = process.env[envName]?.trim()
  if (!secret) {
    console.error(`[${label}] ${envName} missing.`)
    return false
  }

  const header = request.headers.get('authorization') ?? ''
  return timingSafeEqualStrings(header, `Bearer ${secret}`)
}
