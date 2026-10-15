import { useState } from 'react'

/**
 * Devuelve el último valor no nulo recibido. Sirve para que un drawer cuyo
 * contenido depende de un elemento seleccionado (`item` pasa a `null` al
 * cerrar) siga pintando ese contenido durante la animación de salida, en vez
 * de desmontarse de golpe.
 */
export function useRetainedValue<T>(value: T | null | undefined): T | null {
  const [retained, setRetained] = useState<T | null>(value ?? null)
  // Ajuste durante el render (no en un efecto): se queda con el último no nulo.
  if (value != null && value !== retained) {
    setRetained(value)
  }
  return value ?? retained
}
