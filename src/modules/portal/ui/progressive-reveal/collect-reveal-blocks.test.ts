// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import {
  collectRevealBlocks,
  collectSeenText,
  containsSkeleton,
  type RevealDomProbe,
  wasAlreadyVisible,
} from './collect-reveal-blocks'

// jsdom no maquetea: la sonda se inyecta (todo visible; «fila» = data-row).
const probe: RevealDomProbe = {
  isVisible: (el) => !el.hasAttribute('hidden'),
  isRowLayout: (el) => el.hasAttribute('data-row'),
}

function build(html: string): Element {
  const host = document.createElement('div')
  host.innerHTML = html
  return host.firstElementChild as Element
}

const ids = (blocks: Element[]) => blocks.map((b) => b.id)

describe('collectRevealBlocks', () => {
  it('toma los hijos como franjas, en orden de arriba abajo', () => {
    const root = build('<div><h1 id="a"></h1><p id="b"></p><section id="c"></section></div>')
    expect(ids(collectRevealBlocks(root, probe))).toEqual(['a', 'b', 'c'])
  })

  it('atraviesa envoltorios de un solo hijo', () => {
    const root = build('<div><div><div><h1 id="a"></h1><p id="b"></p></div></div></div>')
    expect(ids(collectRevealBlocks(root, probe))).toEqual(['a', 'b'])
  })

  it('divide una fila en celdas, de izquierda a derecha', () => {
    const root = build(
      '<div><h1 id="t"></h1><div data-row><i id="l"></i><i id="m"></i><i id="r"></i></div></div>'
    )
    expect(ids(collectRevealBlocks(root, probe))).toEqual(['t', 'l', 'm', 'r'])
  })

  it('no divide un contenedor que no es fila', () => {
    const root = build('<div><h1 id="t"></h1><div id="col"><i></i><i></i></div></div>')
    expect(ids(collectRevealBlocks(root, probe))).toEqual(['t', 'col'])
  })

  it('salta skeletons y anima por partes un contenedor mixto', () => {
    const root = build(
      '<div><h1 id="t"></h1><div id="mix"><p id="real"></p><div data-slot="skeleton"></div></div></div>'
    )
    expect(ids(collectRevealBlocks(root, probe))).toEqual(['t', 'real'])
  })

  it('ignora lo oculto, los scripts y un skeleton raíz', () => {
    const root = build('<div><h1 id="a"></h1><p id="h" hidden></p><script></script></div>')
    expect(ids(collectRevealBlocks(root, probe))).toEqual(['a'])
    expect(collectRevealBlocks(build('<div data-slot="skeleton"></div>'), probe)).toEqual([])
  })

  it('un hoja sin skeleton se devuelve a sí misma', () => {
    const root = build('<div id="solo"></div>')
    expect(ids(collectRevealBlocks(root, probe))).toEqual(['solo'])
  })
})

describe('containsSkeleton', () => {
  it('detecta skeletons propios, anidados y aria-busy; no texto', () => {
    expect(containsSkeleton(build('<div data-slot="skeleton"></div>'))).toBe(true)
    expect(containsSkeleton(build('<div><div aria-busy="true"></div></div>'))).toBe(true)
    expect(containsSkeleton(build('<div><p></p></div>'))).toBe(false)
    expect(containsSkeleton(document.createTextNode('x'))).toBe(false)
  })
})

describe('texto ya visible en el skeleton retirado (sin parpadeo de títulos)', () => {
  it('un título real que ya estaba en el loading no se vuelve a animar', () => {
    const removed = build(
      '<div><h1>Buenas tardes, Ana</h1><div data-slot="skeleton"></div></div>'
    )
    const seen = collectSeenText([removed])
    const sameTitle = build('<h1 id="t">  Buenas tardes,   Ana </h1>')
    const newCard = build('<section id="c">Resumen del mes</section>')
    expect(wasAlreadyVisible(sameTitle, seen)).toBe(true)
    expect(wasAlreadyVisible(newCard, seen)).toBe(false)
  })

  it('un skeleton puro no aporta texto y nada queda marcado como visto', () => {
    const seen = collectSeenText([build('<div data-slot="skeleton"></div>')])
    expect(seen).toBe('')
    expect(wasAlreadyVisible(build('<h1>Facturas</h1>'), seen)).toBe(false)
  })

  it('un bloque vacío o de un carácter nunca cuenta como visto', () => {
    const seen = collectSeenText([build('<p>a</p>')])
    expect(wasAlreadyVisible(build('<i></i>'), seen)).toBe(false)
    expect(wasAlreadyVisible(build('<i>a</i>'), seen)).toBe(false)
  })
})
