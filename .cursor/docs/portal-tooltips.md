# Tooltips del portal

Contexto para desarrollo y agentes. Leer antes de añadir ayuda contextual en controles del portal.

## Infraestructura

| Pieza | Ubicación | Rol |
| --- | --- | --- |
| Primitivo Radix | [`components/ui/tooltip.tsx`](../../components/ui/tooltip.tsx) | Tooltip, trigger, content |
| Provider global | [`src/modules/portal/ui/portal-shell.tsx`](../../src/modules/portal/ui/portal-shell.tsx) | `TooltipProvider` envuelve el portal |
| Helper | [`src/modules/portal/ui/portal-action-tooltip.tsx`](../../src/modules/portal/ui/portal-action-tooltip.tsx) | Wrapper para botones/enlaces con soporte `disabled` |
| Botón de acción | [`src/modules/portal/ui/portal-action-button.tsx`](../../src/modules/portal/ui/portal-action-button.tsx) | Tooltip + atajo + icono opcional + estados (`pending`, `scaleOnHover`, `spinWhenPending`) |

## Cuándo usar `PortalActionButton`

- Botones del portal con tooltip, atajo de teclado y/o icono con estado (Actualizar, Nueva incidencia).
- No duplicar markup: variar con props (`icon`, `iconBehavior`, `variant`, `compact`).

## Cuándo usar `PortalActionTooltip`

- Sustituir `title` nativo del navegador en controles interactivos del portal.
- Botones solo icono (tema, nav colapsado, topbar, toolbar chatter).
- Botones con texto visible que necesitan ayuda suplementaria (ej. atajo Alt+R en Actualizar).

No usar tooltip como única fuente de nombre accesible: siempre `aria-label` o texto visible.

## Reglas de accesibilidad

1. **Eliminar `title`** al migrar (evitar doble tooltip).
2. **Texto visible en el botón** → el nombre accesible sale del texto; el tooltip lleva info extra (atajos). Usar `aria-keyshortcuts` cuando aplique.
3. **Solo icono** → `aria-label` corto + tooltip con la misma etiqueta para usuarios de puntero.
4. **Toolbar con atajos** (chatter) → `aria-label` = acción (`Negrita`); tooltip = combinación de teclas (`Ctrl+B`).
5. **Botón `disabled`** → `PortalActionTooltip` envuelve con `<span tabIndex={0}>` para que Radix pueda mostrar el tooltip.
6. **Móvil/táctil** → Radix no muestra tooltip al tap; la info crítica debe estar en `aria-label`, texto visible o `aria-keyshortcuts`.

## Ejemplos migrados

- [`portal-refresh-button.tsx`](../../src/modules/portal/ui/portal-refresh-button.tsx) — usa `PortalActionButton`; hint Alt+R
- [`tramite-create-incidencia-button.tsx`](../../src/modules/tramites/ui/tramite-create-incidencia-button.tsx) — usa `PortalActionButton`; hint Alt+N
- [`theme-toggle.tsx`](../../src/modules/portal/ui/theme-toggle.tsx) — opciones de tema
- [`sign-out-button.tsx`](../../src/modules/auth/ui/sign-out-button.tsx) — sidebar colapsado
- [`portal-shell.tsx`](../../src/modules/portal/ui/portal-shell.tsx) — nav colapsado y avatar
- [`portal-top-bar.tsx`](../../src/modules/portal/ui/portal-top-bar.tsx) — toggle sidebar y menú móvil
- [`chatter-composer.tsx`](../../src/modules/portal/ui/chatter-composer.tsx) — botones de formato
- [`tramites-page-view.tsx`](../../src/modules/tramites/ui/tramites-page-view.tsx) — punto de mensajes sin leer

## Copy

Textos de tooltips en [`content/portal.ts`](../../content/portal.ts) (`shell`, `shortcuts`, `notifications`) o en el módulo de contenido del feature.
