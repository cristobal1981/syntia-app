# Instrucciones para Claude Code en este repo

## Commits

Nunca añadas `Co-Authored-By: Claude ...` ni la línea `Claude-Session: ...` al mensaje de un commit. El usuario lo ha pedido repetidas veces — commitea con mensaje limpio, sin trailer de atribución a Claude.

Antes de cada commit, comprueba que `build`, `lint`, `tsc` y los tests pasan. Si algo falla, no preguntes: arréglalo o repórtalo, y no commitees en rojo.

## Errores conocidos

Al empezar una tarea nueva, lee antes la página de Notion `Syntia — Histórico de Errores` (https://app.notion.com/p/3dc96234e54981f995b9f0823e66ce24), sobre todo «Resumen de errores conocidos a evitar». Si encadenas varias tareas seguidas en la misma sesión, no hace falta releerla en cada una. Cuando aparezca un error nuevo o uno que ya se haya visto y no esté anotado, añádelo ahí con su causa, su solución y si está confirmada.

## Migraciones de Supabase

La Data API no expone tablas nuevas por defecto («Automatically expose new tables» desactivado). Toda migración que cree una tabla en `public` debe añadir `grant select, insert, update, delete on public.<tabla> to service_role;`. No des grants a `anon` ni `authenticated` salvo que haya una política RLS de lectura que lo justifique.

## Funcionalidad desactivada a propósito (NO es código muerto)

Lo que sigue está apagado por decisión de producto y se conserva entero (rutas, formularios, validación, acciones y tests) para poder reactivarlo. No lo borres en limpiezas de código sin uso, barridos de knip ni tareas de higiene, aunque no tenga accesos visibles. Se apaga y se reactiva en un solo sitio.

- **Alta de trabajador** (`/alta-trabajador` y el módulo `src/modules/alta-trabajador`), junto con **baja de trabajador** y **carta de vacaciones**: desactivadas en `UNAVAILABLE_PROCEDURE_TYPES` de `src/modules/tramites/domain/procedure-ticket-types.ts`. Con eso desaparecen del selector de «Nueva solicitud» y del buscador, la acción del servidor responde `forbidden` y la ruta `/alta-trabajador` da 404; en «Nueva solicitud» quedan la consulta general y las bajas de autónomo y de servicio. Para reactivar una, quítala de ese conjunto. Desde el 2026-10-15.
- **Facturación (mock local)** (`/facturacion` y el módulo `src/modules/facturacion`, copy en `content/facturacion.ts`): borrador solo para local, con datos en el `localStorage` del navegador y sin backend. Se apaga solo en Vercel (cualquier despliegue define `VERCEL`): la ruta da 404 y desaparece del menú; para abrirla en un entorno de Vercel hay que poner `INVOICING_MOCK_ENABLED=1` en él (solo los clientes, no los colaboradores); el único punto de control es `isInvoicingMockEnabled` en `src/modules/facturacion/domain/invoicing-availability.ts`. No es código muerto. Desde el 2026-10-16; interruptor por variable desde el 2026-10-23.

## Push y Notion

Nunca hagas `git push` por tu cuenta. Al terminar una tarea:

1. Pregunta al usuario si da el OK para pushear. Sin un OK explícito a esa pregunta, no se pushea; un OK anterior para otra tarea no vale.
2. Con el OK, pushea y, en el mismo paso, actualiza el backlog de Notion (`Syntia — Backlog técnico`): marca como hechas (`- [x] ✅ RESUELTO (fecha)`, con el commit) las tareas que se han commiteado y se pushean.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
