'use client'

import { useEffect } from 'react'

/**
 * Marca `<html>` como `dark` mientras está montado (los toasts se pintan en un
 * portal fuera del árbol del layout y solo heredan el tema desde `<html>`).
 * No pasa por next-themes, así que no toca la preferencia guardada del usuario.
 */
export function ForceDarkHtml() {
  useEffect(() => {
    const root = document.documentElement
    if (root.classList.contains('dark')) return
    root.classList.add('dark')
    return () => root.classList.remove('dark')
  }, [])

  return null
}
