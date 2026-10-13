-- Endurece `client_integrations.drive_folder_id`: es la carpeta "Pública" del
-- cliente y la única raíz que usa el portal.
--
-- Modelo (lista blanca): la service account NO es miembro del Shared Drive;
-- solo se comparte con ella la carpeta "Pública" de cada cliente. Dos clientes
-- nunca deben apuntar a la misma carpeta, o uno vería los documentos del otro.
--
-- ANTES DE APLICAR en un entorno con datos, comprobar duplicados:
--   select drive_folder_id, count(*) from public.client_integrations
--   where drive_folder_id is not null group by 1 having count(*) > 1;
-- Si devuelve filas, el índice único falla: corregir esos clientes primero.
--
-- El check va `not valid`: solo se aplica a filas nuevas o modificadas, para no
-- bloquear la migración por datos antiguos. Tras revisarlos:
--   alter table public.client_integrations
--     validate constraint client_integrations_drive_folder_id_format;
alter table public.client_integrations
  add constraint client_integrations_drive_folder_id_format
  check (
    drive_folder_id is null
    or drive_folder_id ~ '^[A-Za-z0-9_-]{10,128}$'
  ) not valid;

create unique index if not exists client_integrations_drive_folder_id_key
  on public.client_integrations (drive_folder_id)
  where drive_folder_id is not null;

comment on column public.client_integrations.drive_folder_id is
  'ID de Drive de la carpeta Pública del cliente (única raíz que ve el portal). Compartida con la service account; nunca se expone al navegador.';
