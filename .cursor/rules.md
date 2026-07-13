# Cursor Rules for syntia-app

> **Reglas de agente (Cursor):** disciplina de desarrollo y convenciones de producto están en `.cursor/rules/*.mdc` (`alwaysApply` o por glob). Este archivo es la **referencia de marca y UI** (paleta, tipografía, tono).

Identidad de marca Syntia 2025 — contenido embebido en este archivo (manual de identidad no versionado).

## Stack
- Framework: Next.js 16 (App Router)
- Styling: Tailwind CSS 4
- Components: React 19 + shadcn/ui (mínimo: button, input, textarea)
- Animaciones: GSAP + ScrollTrigger (hero); framer-motion (scroll); CSS (floating blobs en hero)
- Contenido: `content/site.ts`

## Estructura

```bash
app/
├── layout.tsx
├── page.tsx
├── proximamente/page.tsx   # WIP / no implementado → errorPages.wip
├── not-found.tsx
├── error.tsx
└── globals.css
components/
├── layout/section-shell.tsx
└── ui/               (solo componentes usados)
content/
└── site.ts
lib/
└── utils.ts
src/
├── modules/          # dominio por feature (vacío al inicio)
└── shared/config/
public/brand/
```

## Identidad de marca (Syntia)

### Esencia
- Asesoría digital: clara, moderna, cercana, sin tecnicismos.
- Claim: **Digitaliza. Innova. Crece.**
- Valores a reflejar en UI y copy: profesionalidad, modernidad, cercanía, innovación accesible.

### Tono de voz (copy en `content/site.ts`)
- Cercano pero profesional; nunca distante ni burocrático.
- Claro, sin jerga técnica innecesaria.
- Inspirador y orientado al crecimiento del cliente.
- Evitar tono de "asesoría tradicional" (burocrático).
- En copy visible al usuario: entidad = **asesoría**; persona = **asesor** (nunca «gestor» ni «gestoría»).

## Tipografía

| Rol | Familia | Pesos | Uso |
| --- | --- | --- | --- |
| Principal | **Host Grotesk** | Regular, Medium, Semibold, Bold | Logotipo, titulares (H1–H3), badges, CTAs, mensajes clave |
| Secundaria | **Archivo** | Light, Regular, Semibold | Párrafos, subtítulos de apoyo, formularios, textos largos |

### Jerarquía (digital)
- **H1 / hero:** Host Grotesk Semibold o Bold; tamaño generoso, `leading-tight`.
- **H2 / sección:** Host Grotesk Semibold.
- **H3 / etiquetas:** Host Grotesk Medium o Semibold; `uppercase tracking-wide` solo en badges/labels.
- **Cuerpo:** Archivo Light o Regular; `leading-relaxed`.
- **Destacados en texto:** Host Grotesk; color acento Verde Syntia.
- No mezclar más de estas dos familias en una misma pieza.

### Implementación
- `layout.tsx`: `Host_Grotesk` + `Archivo` con `weight`, `display: swap`; `archivo.className` en `body`.
- `globals.css` `@layer base`: `body` → Archivo; `h1–h6` → Host Grotesk (`font-family` explícito).
- Utilidades: `badge-on-dark`, `badge-on-light`, `input-on-dark`, `prose-width`.
- No usar Geist ni otras fuentes del template.
- En fondos oscuros: texto secundario `text-muted-on-dark`; acentos e highlights `text-primary` (Verde Syntia). Turquesa solo en degradados o dinamismo secundario.

## Paleta de color

### Primarios
| Nombre | HEX | Uso |
| --- | --- | --- |
| Verde Syntia | `#01DEA2` | Acento identitario: botones primarios, enlaces activos, highlights, iconos destacados. Uso **puntual** (alta intensidad). |
| Verde Noche | `#041D23` | Fondo principal oscuro, texto sobre fondos claros. |
| Blanco Neblina | `#F0F6F6` | Texto sobre fondos oscuros, fondos claros (p. ej. sección contacto). |

### Secundarios
| Nombre | HEX | Uso |
| --- | --- | --- |
| Verde Brisa | `#D6F2E8` | Fondos suaves, bloques informativos, variantes claras. |
| Verde Turquesa | `#2BC0A9` | Degradados, iconos en fondos claros, dinamismo. |
| Verde Agua | `#01635C` | Bordes, fondos intermedios, CTAs secundarios, degradados con Verde Noche. |

### Variables CSS (`app/globals.css`)
Tokens por superficie (no invertir `foreground` como fondo):

| Token Tailwind | Uso |
| --- | --- |
| `surface-dark` / `background` | Fondo oscuro (Verde Noche) |
| `on-dark` / `foreground` | Texto en oscuro (Neblina) |
| `surface-light` | Secciones claras |
| `on-light` | Texto en claro (Noche) |
| `muted-on-dark` | Subtítulos en oscuro (AA 4.5:1) |
| `muted-on-light` / `on-light-muted` | Subtítulos en claro |
| `accent-on-light` | Acentos en superficie clara (= Agua) |
| `primary` | Verde Syntia: CTAs, highlights, iconos, enlaces activos |
| `turquesa` | Degradados y acentos secundarios (uso moderado) |

En Tailwind usar tokens semánticos; evitar `bg-foreground` en secciones.

## Lenguaje visual

### Composición
- Layouts ordenados y limpios; formas rectangulares con esquinas ligeramente recortadas/redondeadas (coherente con el isotipo).
- Ancho máximo unificado: `max-w-7xl` vía `SectionShell`.
- Degradados suaves entre Verde Noche, Verde Agua y tonos secundarios en heroes y fondos amplios.

### Iconografía
- Estilo **lineal**, esquinas redondeadas, terminaciones rectas.
- En fondos oscuros: Blanco Neblina, Verde Syntia o Verde Turquesa (priorizar Syntia/Turquesa).
- En fondos claros: Verde Noche, Verde Syntia o Verde Turquesa.

### Logotipo
- Versión horizontal como preferente en header/web.
- Mínimos digitales: isotipo ≥35px altura; conjunto horizontal ≥80px altura.
- No deformar, rotar, añadir efectos ni cambiar colores oficiales.

## Funcionalidad no implementada

- **No usar** `404`, `400` ni `500` para features en desarrollo.
- **Enlazar o redirigir** a **`/proximamente`** (`content/errors.ts` → `notImplementedPath`).
- Reutilizar `components/errors/error-screen.tsx`.

## Convenciones de producto
- `scroll-behavior: auto` en `html` (requerido por GSAP ScrollTrigger / parallax; no usar `smooth` global).
- Textos centralizados en `content/site.ts`.
- Botón primario: fondo Verde Syntia, texto Verde Noche; hover con opacidad, no otro color.

## Comandos
- `pnpm dev` — desarrollo
- `pnpm build` — producción

## Checklist antes de entregar UI
- [x] Tipografías: Host Grotesk (títulos) + Archivo (cuerpo) vía `next/font` + `font-family` en base
- [x] Tokens `surface-light` / `on-light` / `muted-on-dark` (no hacks `bg-foreground`)
- [x] Verde Syntia (`primary`) en CTAs y acentos; turquesa/agua solo en degradados y secundarios
- [x] Contraste AA documentado en comentario de `globals.css`
- [ ] Copy alineado con tono de voz del manual
- [x] Degradados y decoración moderados (legibilidad primero)
