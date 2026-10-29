-- Dos contadores más por ejecución del dispatcher de push, para ver de un vistazo si el servicio
-- de push rechaza los envíos o si fallan por algo transitorio. Hasta ahora ambos casos solo
-- sumaban a `skipped`, junto con otros motivos (colaborador sin secciones, error al procesar…).
--
--  * `rejected`: el servicio de push rechazó el envío (400, 401, 403 o 413: clave VAPID, petición
--    o tamaño). Si se repite en ejecuciones seguidas suele ser configuración, no un dispositivo.
--  * `failed`: fallo transitorio (red, 429 o 5xx): se reintenta en la siguiente ejecución.
--
-- Ambos suman también a `skipped`. El código sigue funcionando sin esta migración: guarda la
-- ejecución sin estas dos columnas.
alter table public.push_runs
  add column if not exists rejected integer not null default 0,
  add column if not exists failed integer not null default 0;
