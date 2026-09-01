-- Preview del correo de alta de autónomo: guarda el subject/html exactos
-- que se enviaron en cada solicitud, para poder mostrarlos después en el
-- detalle (antes solo se guardaban metadatos de tracking de Resend).
-- No hay sistema de migraciones en el repo (el esquema de Supabase se
-- gestiona manualmente en el dashboard) — ejecutar esto a mano una vez
-- contra el proyecto de Supabase antes de desplegar esta rama.

alter table onboarding_form_access_tokens
  add column if not exists email_subject text;

alter table onboarding_form_access_tokens
  add column if not exists email_html text;
