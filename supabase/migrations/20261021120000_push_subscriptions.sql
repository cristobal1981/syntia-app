-- Suscripciones de notificaciones push del portal (una fila por dispositivo y
-- navegador). `user_id` es `users.id` (el mismo actor que usan chatter_read_state
-- y portal_record_watch_state). `sent_keys` guarda las claves de avisos ya
-- enviados para no repetir el push de lo mismo en la siguiente ejecución.
--
-- Solo se usa con service_role (acciones del servidor y dispatcher), como el
-- resto de tablas de la app — ver 20261002095806_enable_rls.sql.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  notify_chatter boolean not null default true,
  notify_status boolean not null default true,
  notify_firmas boolean not null default true,
  sent_keys jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists push_subscriptions_endpoint_key
  on public.push_subscriptions (endpoint);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

grant select, insert, update, delete on public.push_subscriptions to service_role;
