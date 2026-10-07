import { ForceDarkHtml } from '@/components/providers/force-dark-html'

/**
 * El login siempre va en oscuro. Se fuerza aquí (clase `dark` en el árbol) y no
 * en el ThemeProvider raíz: leer la ruta allí obliga a Suspense en las rutas
 * con parámetros dinámicos al activar Cache Components.
 */
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark flex min-h-dvh flex-1 flex-col bg-background text-foreground">
      <ForceDarkHtml />
      {children}
    </div>
  )
}
