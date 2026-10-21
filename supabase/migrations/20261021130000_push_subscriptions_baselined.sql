-- Marca cuándo se tomó la «foto inicial» de avisos de una suscripción: la
-- primera ejecución del dispatcher registra lo que ya estaba pendiente como
-- enviado, sin mandar nada, para que activar el push no dispare una avalancha.

alter table public.push_subscriptions
  add column if not exists baselined_at timestamptz;
