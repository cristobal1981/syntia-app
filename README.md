# Syntia App

Aplicación Next.js del ecosistema Syntia, con identidad de marca y arquitectura modular preparada para escalar.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![PNPM](https://img.shields.io/badge/Package_Manager-pnpm-F69220?logo=pnpm&logoColor=white)

## Stack

| Capa | Tecnología | Rol |
|---|---|---|
| Frontend App | `Next.js 16` + `React 19` | Renderizado, rutas App Router |
| UI System | `Tailwind CSS 4` + `tw-animate-css` | Estilos, utilidades, tokens Syntia |
| Motion | `Framer Motion` + `GSAP` | Animaciones de secciones |
| Tipado | `TypeScript (strict)` | Contratos estables |
| Tooling | `pnpm` | Gestión de dependencias/scripts |

## Arquitectura

Modular por dominio con enfoque hexagonal pragmático:

- `domain`: tipos y reglas de negocio puras.
- `application`: casos de uso.
- `infrastructure`: adaptadores a servicios externos.
- `ui`: componentes y composición visual.

```text
app/
src/
  modules/          # features por dominio (ver src/modules/README.md)
  shared/config/    # re-exports de content/
components/
content/
lib/
public/
  brand/            # logos, favicons, Sappo
  partners/         # logos de partners
  team/             # fotos del equipo
```

## Dónde tocar cada cosa

- **Copy y contenido:** `content/site.ts` (preferente vía `src/shared/config/site.ts`)
- **Marca y tokens:** `app/globals.css`, `.cursor/rules.md`
- **Fuentes:** `app/layout.tsx`
- **WIP / no implementado:** `/proximamente` (`content/errors.ts`)
- **Reglas de agente:** `.cursor/rules/`

## Desarrollo

```sh
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

```sh
pnpm dev      # desarrollo local
pnpm build    # build producción
pnpm start    # servir build
pnpm lint     # eslint
```

## Verificación local

```sh
pnpm exec tsc --noEmit
pnpm build
```

## Ramas

- `develop` — rama de trabajo activa
- `main` — producción (merge desde develop)

## Seguridad y documentación sensible

- No subir manuales internos de identidad corporativa ni documentación confidencial al repositorio.
- El manual PDF puede vivir en `docs/` localmente (gitignored vía `docs/*.pdf`).
- Revisar siempre `docs/` antes de cada commit.
- Mantener secretos en variables de entorno (ver `.env.example`).
