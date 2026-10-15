---
name: code-hygiene
description: Gradual, behavior-preserving cleanup of syntia-app code — unused exports/dead code, clean-code fixes and short maintenance comments — tracked in a ledger (and mirrored to Notion) so reviewed files stay done and only new or changed files come back as pending; works in parallel with caveman-ultra subagents. Use when asked to "limpiar código", "clean code", "revisar exports sin usar", "código muerto", or to continue the cleanup sweep.
---

# Code hygiene (limpieza gradual con registro)

Goal: leave the codebase easier to maintain without changing behavior, in
small reviewed batches. A ledger (`reviewed.json`, next to this file) stores
the git hash of every file at review time. A file is **pending** if it is not
in the ledger or its content changed since (new development reopens it).
The human-facing log lives in Notion:
**«Syntia — Registro de limpieza de código»**
(https://app.notion.com/p/3f996234e549815b81f3d23268f4e953), child of
«Syntia — Portal de Clientes».

## Session flow (lead agent)

1. `node .claude/skills/code-hygiene/status.mjs status` — pending per module.
2. Pick modules for this session (disjoint folders). Run knip once and keep
   the candidate list: `pnpm dlx knip --no-progress --reporter compact`.
3. Split work into batches of ~10 files, one module folder each, and launch
   them **in parallel** as subagents (see below). Without subagent support,
   do the batches one by one.
4. When agents finish, verify yourself, not from their reports: `git diff`
   on every touched file, then `pnpm tsc --noEmit`, `pnpm eslint .` and the
   full `pnpm vitest run`. A report that says "done" proves nothing.
5. Revert any edit that breaks something or changes behavior.
6. Only then `status.mjs mark <files>` (reviewed files left unchanged count
   too; skipped files never do), and `status.mjs prune` if files were deleted.
7. Update the Notion log (below).
8. **One global commit** for the whole session: cleanup plus the updated
   `reviewed.json`. Clean message, no `Co-Authored-By` or session trailer
   (see CLAUDE.md).

## Parallel subagents

- One subagent per batch, never two on the same file or folder, and agents
  never touch `reviewed.json` (the lead marks after verifying).
- Launch with `Agent` (general-purpose). The prompt must be self-contained:
  the batch's file list, the Checklist and Rules below, the knip candidates
  for those files, and these output rules:
  - "Responde en modo caveman ultra: telegráfico, sin relleno."
  - Final report only: files changed (path, one line each), findings out of
    scope (`path:line` + 1 line), commands run with pass/fail. No code dumps,
    no narration.
- Agents may run `tsc`/`eslint`/`vitest` scoped to their module, but must not
  run the full suite in parallel with other agents (the lead does that).
- Findings that need a decision (behavior change, bug, sensitive code) come
  back as findings; agents don't fix them.

## Checklist (per file)

- **Unused exports/dead code.** For each knip candidate, verify by hand: grep
  the name across `app`, `src`, `components`, `content`, `lib`, tests,
  `scripts`, dynamic `import()` and strings (cache tags, route names, env
  keys). Remove only what has zero uses. An export used only by its own test
  is a decision: report, don't delete. Un-export (not delete) when it is used
  inside its own file.
- **Clean code, behavior preserved.** Split functions over ~50 lines or with
  nesting deeper than 3 when it reads better; name magic numbers; remove
  duplicated branches and impossible conditions; replace boolean-soup
  parameters with a named object. No renames of public APIs, routes, cache
  tags, env vars or DB columns in a hygiene pass.
- **Maintenance comments.** Short block comment (`/** ... */`, 1–4 lines,
  Spanish like the surrounding code) on non-trivial modules, hooks and
  functions saying *what it is for and the non-obvious why* (invariants,
  security reasons, why a cache TTL, why a guard exists). Do not narrate the
  obvious, do not add comments to trivial files, match the file's existing
  density, and delete stale or wrong comments.
- **Leave alone (desactivado a propósito):** lo listado en CLAUDE.md como
  «Funcionalidad desactivada a propósito» (hoy el alta de trabajador y su
  módulo `alta-trabajador`, la baja de trabajador y la carta de vacaciones).
  Nunca es código muerto: no se borra ni se cuenta como pendiente aunque knip
  o la falta de accesos lo hagan parecer sin uso.
- **Leave alone and flag:** behavior changes, bugs found (report with
  file:line, don't fix inside a hygiene pass), security-sensitive branches
  (suggest `mutation-test-pass`), and anything touching Next APIs (read
  `node_modules/next/dist/docs/` first: this Next version has breaking changes).

## Rules

- No feature or bug fix inside a hygiene session.
- If tests fail after a cleanup, the cleanup is wrong until proven otherwise:
  revert that edit, don't edit the test to match.
- Don't touch generated files, `components/ui` (shadcn) or `supabase/` migrations.

## Notion log

After each session, update the Notion page (search by title if the URL
changes). Use `notion-update-page` with `update_content`/`insert_content`,
smallest edit, keeping the page's headings:

- **Resumen:** files in scope, reviewed count, last session date, files
  reopened by new development (status `cambiado`).
- **Pendientes por módulo:** paste the new numbers from `status.mjs status`.
- **Últimas revisiones:** prepend one entry: date, modules, number of files,
  what was cleaned (exports removed, functions split, comments added), and
  the commit hash once it exists.
- **Errores y olores comunes encontrados:** add recurring patterns as
  «patrón — dónde — cómo se arregló»; bump the count if it already exists.
- **Hallazgos fuera de alcance:** every bug or behavior change found,
  `path:line`, what happens, decision (or "pendiente").
- **Decisiones pendientes:** exports used only by tests, sensitive branches
  waiting for a mutation pass.
