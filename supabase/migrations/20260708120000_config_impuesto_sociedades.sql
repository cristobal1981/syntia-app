-- Configuración anual de tipos impositivos IS (AEAT) para workflows n8n.
-- Solo syntia-app (service role) accede; sin políticas RLS para anon/authenticated.

create table if not exists public.config_impuesto_sociedades (
  id uuid primary key default gen_random_uuid(),
  anio integer not null check (anio >= 2000 and anio <= 2100),
  tipo_empresa_key text not null
    check (
      tipo_empresa_key in (
        'general',
        'micropymes',
        'reducida_dimension',
        'nueva_creacion',
        'emergentes',
        'patrimonial'
      )
    ),
  es_escala boolean not null default false,
  tipo_gravamen_fijo numeric(5, 2),
  base_gravamen numeric(12, 2),
  tipo_gravamen_base numeric(5, 2),
  tipo_gravamen_restante numeric(5, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (anio, tipo_empresa_key),
  check (
    (
      es_escala = false
      and tipo_gravamen_fijo is not null
      and base_gravamen is null
      and tipo_gravamen_base is null
      and tipo_gravamen_restante is null
    )
    or (
      es_escala = true
      and tipo_gravamen_fijo is null
      and base_gravamen is not null
      and tipo_gravamen_base is not null
      and tipo_gravamen_restante is not null
    )
  )
);

create index if not exists config_impuesto_sociedades_anio_idx
  on public.config_impuesto_sociedades (anio);

alter table public.config_impuesto_sociedades enable row level security;

revoke all on table public.config_impuesto_sociedades from anon, authenticated;

insert into public.config_impuesto_sociedades (
  anio,
  tipo_empresa_key,
  es_escala,
  tipo_gravamen_fijo,
  base_gravamen,
  tipo_gravamen_base,
  tipo_gravamen_restante
)
values
  (2024, 'general', false, 25, null, null, null),
  (2024, 'micropymes', true, null, 50000, 23, 23),
  (2024, 'reducida_dimension', false, 25, null, null, null),
  (2024, 'nueva_creacion', false, 15, null, null, null),
  (2024, 'emergentes', false, 15, null, null, null),
  (2024, 'patrimonial', false, 25, null, null, null),
  (2025, 'general', false, 25, null, null, null),
  (2025, 'micropymes', true, null, 50000, 21, 22),
  (2025, 'reducida_dimension', false, 24, null, null, null),
  (2025, 'nueva_creacion', false, 15, null, null, null),
  (2025, 'emergentes', false, 15, null, null, null),
  (2025, 'patrimonial', false, 25, null, null, null),
  (2026, 'general', false, 25, null, null, null),
  (2026, 'micropymes', true, null, 50000, 19, 21),
  (2026, 'reducida_dimension', false, 23, null, null, null),
  (2026, 'nueva_creacion', false, 15, null, null, null),
  (2026, 'emergentes', false, 15, null, null, null),
  (2026, 'patrimonial', false, 25, null, null, null)
on conflict (anio, tipo_empresa_key) do nothing;
