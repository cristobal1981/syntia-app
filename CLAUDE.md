# Instrucciones para Claude Code en este repo

## Commits

Nunca añadas `Co-Authored-By: Claude ...` ni la línea `Claude-Session: ...` al mensaje de un commit. El usuario lo ha pedido repetidas veces — commitea con mensaje limpio, sin trailer de atribución a Claude.

## Push y Notion

Nunca hagas `git push` por tu cuenta. Al terminar una tarea:

1. Comprueba que `build`, `lint` (y `tsc`) y los tests pasan. Si algo falla, no preguntes: arréglalo o repórtalo.
2. Pregunta al usuario si da el OK para pushear. Sin un OK explícito a esa pregunta, no se pushea; un OK anterior para otra tarea no vale.
3. Con el OK, pushea y, en el mismo paso, actualiza el backlog de Notion (`Syntia — Backlog técnico`): marca como hechas (`- [x] ✅ RESUELTO (fecha)`, con el commit) las tareas que se han commiteado y se pushean.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
