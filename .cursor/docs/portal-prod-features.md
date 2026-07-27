# Features del portal cliente: develop vs producción

Control de versión de qué puede ver el **cliente** en producción. Complementa la regla [`.cursor/rules/portal-prod-gating.mdc`](../rules/portal-prod-gating.mdc).

## Política

| Rama / entorno | Comportamiento |
| --- | --- |
| `develop` | Puede mostrar WIP (Documentos, Guías hub, solicitudes tipadas, etc.) para probar. |
| `main` / Vercel Production | Solo features revisadas. El resto **desactivado** (nav omitida + redirect a `/proximamente`). |

No hay feature flags por env todavía: el gate es **código** (omitir entradas + `redirect(notImplementedPath)`).

## Checklist obligatorio antes de tocar / mergear a `main`

Marcar mentalmente (o en el PR) cada ítem. Si alguno queda «activado» sin sign-off, **no mergear**.

### Documentos

- [ ] `content/portal.ts` — nav cliente **sin** ítem Documentos
- [ ] `src/modules/portal/ui/client-home.tsx` — **sin** atajo Documentos
- [ ] `app/(portal)/documentos/page.tsx` — `redirect(notImplementedPath)` (no montar `DocumentsPage`)

### Guías

- [ ] `content/portal.ts` — nav cliente **sin** ítem Guías
- [ ] `content/portal.ts` — search extras: solo `extra:guia-modelos` (no hub Guías)
- [ ] `src/modules/portal/ui/client-home.tsx` — **sin** atajo Guías
- [ ] `app/(portal)/guias/page.tsx` — hub → `/proximamente`
- [ ] `app/(portal)/guias/[slug]/page.tsx` — solo `modelos-aeat` / fiscal-models; resto → `/proximamente`

### Solicitudes tipadas + alta trabajador

- [ ] `src/modules/portal/ui/portal-create-consulta-context.tsx` — tipadas desactivadas; solo abre consulta general (`void options` / sin procedure tipado)
- [ ] Drawer / picker: sin alta-baja-vacaciones visibles; tarjeta `comingSoonCard` en consulta general (`content/tramite-solicitudes.ts`: «Próximamente se habilitarán consultas estructuradas…»)
- [ ] `src/modules/portal/ui/portal-top-bar-search.tsx` — **sin** `PROCEDURE_SEARCH_ACTIONS` de tipadas
- [ ] `app/(portal)/alta-trabajador/layout.tsx` — siempre → `/proximamente`

## Debe seguir ON en prod

- Inicio (`/dashboard`)
- Obligaciones
- Trámites (lista + detalle + **consulta general**)
- Firmas
- Perfil
- Guía modelos AEAT (`/guias/modelos-aeat`)

## WIP permanente (no es el gate temporal)

Admin Configuración y advisor Tareas con `implemented: false` → `/proximamente`. No confundir con el gate de Documentos/Guías/tipadas.

## Cómo reactivar (solo con sign-off)

1. Confirmar producto: feature revisada y lista para clientes.
2. Actualizar esta tabla y la regla `.mdc`.
3. En `main`: restaurar nav/home/search + quitar redirects de las rutas afectadas.
4. Verificar en preview antes de producción.

## Cómo re-aplicar el gate si `main` se «abrió» por error

Comparar con `origin/main` en los archivos del checklist (o con el commit histórico de gating `a95be9c` / el tip de producción desplegado) y restaurar esos archivos **sin** traer el resto de develop.

## Nota de riesgo

Si el `main` local va **ahead** de `origin/main` con commits que reactivan features (p. ej. «todo visible» pensado para develop), un `git push` a `main` **activaría** Documentos/Guías/tipadas en producción. Antes de pushear `main`, pasar este checklist.
