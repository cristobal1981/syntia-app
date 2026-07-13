# Estado «nuevo» en listado de trámites (`tramites_list_seen_state`)

Contexto para desarrollo y agentes. Complementa `chatter_read_state` (mensajes no leídos).

## Esquema

Tabla `public.tramites_list_seen_state` en Supabase:

| Columna | Tipo | Notas |
| --- | --- | --- |
| `user_id` | uuid | PK, FK → `users.id` |
| `open_item_keys` | text[] | Claves `tramite-{id}` / `consulta-{id}` de abiertos vistos en la última visita |
| `initialized` | boolean | `false` en primer acceso (baseline silencioso) |
| `updated_at` | timestamptz | |

SQL de creación:

```sql
create table public.tramites_list_seen_state (
  user_id uuid primary key references public.users(id) on delete cascade,
  open_item_keys text[] not null default '{}',
  initialized boolean not null default false,
  updated_at timestamptz not null default now()
);
```

## Reglas de negocio

- Solo rol **client** del portal.
- **Nuevo en listado** = trámite/consulta **abierto** cuya clave no estaba en `open_item_keys` de la visita anterior.
- **Primer acceso** (`initialized = false`): no se marcan novedades; al salir de `/tramites` se guarda baseline.
- **Marcar visto**: al desmontar la página de trámites se hace upsert con los abiertos actuales.
- Distinto de **mensaje no leído** (`MessageCircleWarning`): icono `Flame` + etiqueta «Nuevo».

## Orden del listado

Trámites y consultas en un solo listado ordenado por `write_date` de Odoo (más reciente primero), no agrupados por tipo.

## Seguridad

- Acceso Supabase solo con `createSupabaseAdminClient()` en server actions.
- **RLS:** igual que `chatter_read_state` — script [`supabase/rls-portal-state-tables.sql`](../../supabase/rls-portal-state-tables.sql).

## Archivos clave

| Archivo | Rol |
| --- | --- |
| `src/modules/tramites/infrastructure/tramites-list-seen-state.supabase.ts` | CRUD |
| `src/modules/tramites/application/tramites-list-seen-actions.ts` | Resolver nuevos + ack |
| `src/modules/tramites/domain/tramites-list-seen-state.ts` | Lógica pura |
| `src/modules/tramites/domain/merge-tramites-list.ts` | Merge + sort por `modifiedAt` |
| `src/modules/tramites/ui/tramites-page-view.tsx` | Iconos en tabla |
