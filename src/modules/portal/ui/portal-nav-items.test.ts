import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    createElement('a', { href, ...props }, children),
}))

import type { NavItem } from '@/src/modules/portal/domain/types'
import { renderNavItem } from '@/src/modules/portal/ui/portal-nav-items'

const group: NavItem = {
  label: 'Facturación',
  implemented: true,
  icon: 'invoicing',
  children: [
    { label: 'Panel', href: '/facturacion/panel', implemented: true, icon: 'home' },
    { label: 'Facturas', href: '/facturacion/facturas', implemented: true, icon: 'invoicing' },
  ],
}

const html = (pathname: string) => renderToString(createElement('div', null, renderNavItem(group, pathname, false, null)))

describe('desplegable del sidebar', () => {
  it('el recorte de la animación deja sitio al anillo de foco: 4 px a los lados y 2 px arriba y abajo', () => {
    const markup = html('/facturacion/panel')
    expect(markup).toContain('-mx-1 min-h-0 overflow-hidden px-1')
    expect(markup).toContain('py-0.5')
  })

  it('con una ruta del grupo se abre solo, y cerrado no recibe foco', () => {
    expect(html('/facturacion/facturas')).not.toContain('inert')
    expect(html('/dashboard')).toContain('inert')
  })

  it('cada hijo es un enlace con anillo de foco visible', () => {
    const markup = html('/facturacion/panel')
    expect(markup).toContain('href="/facturacion/panel"')
    expect(markup).toContain('focus-visible:ring-2')
  })
})
