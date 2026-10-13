-- Colaboradores: acceso limitado al portal para empresas/autónomos.
-- No hay sistema de migraciones en el repo (el esquema de Supabase se
-- gestiona manualmente en el dashboard) — ejecutar esto a mano una vez
-- contra el proyecto de Supabase antes de desplegar esta rama.

alter table client_integrations
  add column if not exists workers_enabled boolean not null default false;

alter table client_integrations
  add column if not exists max_workers integer not null default 5;

-- Si la columna `role` de `users` tiene un CHECK constraint explícito,
-- añadir 'worker' a los valores permitidos (revisar en el dashboard;
-- si es un `text` libre sin constraint, este paso no aplica).

-- `allowed_sections`: objeto `{ href: 'read' | 'write' }`, ausente = sin
-- acceso a esa sección (p. ej. `{"/tramites": "write", "/documentos": "read"}`).
-- `/firmas` y `/guias` no tienen mutación propia en el portal, así que en la
-- práctica solo llevan 'read'.
create table if not exists worker_grants (
  worker_user_id uuid primary key references users(id) on delete cascade,
  owner_user_id uuid not null references users(id) on delete cascade,
  allowed_sections jsonb not null default '{}',
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists worker_grants_owner_user_id_idx
  on worker_grants (owner_user_id);

-- Backfill: filas creadas antes del rediseño de permisos por nivel guardaban
-- `allowed_sections` como array de hrefs (acceso completo implícito). Idempotente
-- — el `where` solo afecta a filas que todavía tengan el shape antiguo.
update worker_grants
set allowed_sections = (
  select coalesce(jsonb_object_agg(href, 'write'), '{}'::jsonb)
  from jsonb_array_elements_text(allowed_sections) as href
)
where jsonb_typeof(allowed_sections) = 'array';
