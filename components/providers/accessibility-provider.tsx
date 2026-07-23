'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

export type FontScale = 'sm' | 'md' | 'lg' | 'xl'

export type AccessibilitySettings = {
  fontScale: FontScale
  highContrast: boolean
  underlineLinks: boolean
}

export const A11Y_STORAGE_KEY = 'syntia-a11y'

export const FONT_SCALES: readonly FontScale[] = ['sm', 'md', 'lg', 'xl']

const DEFAULT_SETTINGS: AccessibilitySettings = {
  fontScale: 'md',
  highContrast: false,
  underlineLinks: false,
}

function parseStoredSettings(raw: string | null): AccessibilitySettings {
  if (!raw) return DEFAULT_SETTINGS

  try {
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_SETTINGS

    const candidate = parsed as Record<string, unknown>
    return {
      fontScale: FONT_SCALES.includes(candidate.fontScale as FontScale)
        ? (candidate.fontScale as FontScale)
        : DEFAULT_SETTINGS.fontScale,
      highContrast: candidate.highContrast === true,
      underlineLinks: candidate.underlineLinks === true,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

/*
 * Estado inicial seguro para SSR: en servidor devuelve los valores por
 * defecto; en cliente lee lo persistido (ya aplicado al <html> por el
 * script pre-pintado). Ningún markup siempre montado depende de estos
 * valores, así que no hay riesgo de desajuste de hidratación.
 */
function readInitialSettings(): AccessibilitySettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    return parseStoredSettings(window.localStorage.getItem(A11Y_STORAGE_KEY))
  } catch {
    return DEFAULT_SETTINGS
  }
}

function applySettings(settings: AccessibilitySettings) {
  const el = document.documentElement
  if (settings.fontScale === 'md') {
    el.removeAttribute('data-font-scale')
  } else {
    el.setAttribute('data-font-scale', settings.fontScale)
  }
  el.classList.toggle('hc', settings.highContrast)
  el.classList.toggle('a11y-underline', settings.underlineLinks)
}

type AccessibilityContextValue = {
  settings: AccessibilitySettings
  setFontScale: (value: FontScale) => void
  setHighContrast: (value: boolean) => void
  setUnderlineLinks: (value: boolean) => void
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

type AccessibilityProviderProps = {
  children: ReactNode
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>(readInitialSettings)

  const updateSettings = useCallback((patch: Partial<AccessibilitySettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }
      applySettings(next)
      try {
        window.localStorage.setItem(A11Y_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // Sin persistencia: la preferencia sigue aplicada en la sesión actual
      }
      return next
    })
  }, [])

  const setFontScale = useCallback(
    (value: FontScale) => updateSettings({ fontScale: value }),
    [updateSettings]
  )
  const setHighContrast = useCallback(
    (value: boolean) => updateSettings({ highContrast: value }),
    [updateSettings]
  )
  const setUnderlineLinks = useCallback(
    (value: boolean) => updateSettings({ underlineLinks: value }),
    [updateSettings]
  )

  return (
    <AccessibilityContext.Provider
      value={{ settings, setFontScale, setHighContrast, setUnderlineLinks }}
    >
      {children}
    </AccessibilityContext.Provider>
  )
}

export function useAccessibility(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error('useAccessibility debe usarse dentro de AccessibilityProvider')
  }
  return context
}
