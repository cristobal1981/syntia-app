-- Agregación del reporte de leads (funnel, segmentos, valor perdido,
-- motivos, tendencia, candidatos de contacto) movida a SQL.
--
-- Antes, `getLeadReport()` traía TODA `landing_autonomo_leads`, TODA
-- `landing_autonomo_lead_contacts` y TODA `client_integrations` a Node y
-- agregaba en memoria (`buildLeadReport`) — sin límite, sin paginación.
-- Hoy el volumen es 0 filas, pero esas tres tablas solo crecen (leads de
-- landing, nunca se purgan) y no alimentan ninguna lista paginable, solo
-- este reporte: paginar las queries sin mover la agregación habría
-- corrompido el funnel/tendencias/KPIs en cuanto hubiera más leads que el
-- límite. Mover el cálculo aquí deja que Postgres agregue con índices en
-- vez de transferir filas crudas a Node, y la función sustituye a
-- `listLeads()`, `listLatestContactByLead()` y `listConvertedOdooPartnerIds()`
-- (las tres solo alimentaban este reporte).
create or replace function public.get_lead_report()
returns jsonb
language sql
stable
set search_path = public
as $$
with lead_estados(estado, ord) as (
  values ('pendiente', 1), ('aceptado', 2), ('rechazado', 3), ('no_interesa', 4)
),
leads_norm as (
  select
    l.id,
    l.odoo_partner_id,
    l.nombre,
    l.email,
    case when l.tipo in ('ALTA', 'CAMBIO') then l.tipo else null end as tipo,
    case when l.residencia in ('Canarias', 'Peninsula') then l.residencia else null end as residencia,
    l.facturacion_estimada,
    case
      when l.codigo_cuota in ('TRAMO_30', 'TRAMO_50', 'TRAMO_90') then l.codigo_cuota
      else null
    end as codigo_cuota,
    l.total_mensual,
    case
      when l.estado in ('pendiente', 'aceptado', 'rechazado', 'no_interesa') then l.estado
      else 'pendiente'
    end as estado,
    nullif(trim(l.motivo), '') as motivo,
    l.created_at,
    to_char(l.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as created_at_text,
    exists (
      select 1
      from public.client_integrations ci
      where ci.odoo_partner_id = l.odoo_partner_id
    ) as is_converted,
    case
      when l.facturacion_estimada is null then null
      when l.facturacion_estimada < 9600 then 'lt_9600'
      when l.facturacion_estimada < 12600 then 'from_9600_to_12600'
      when l.facturacion_estimada < 17000 then 'from_12600_to_17000'
      when l.facturacion_estimada < 50000 then 'from_17000_to_50000'
      else 'gte_50000'
    end as facturacion_bucket
  from public.landing_autonomo_leads l
),
not_converted as (
  select * from leads_norm where not is_converted
),
contactable as (
  select
    l.*,
    (
      select max(lc.created_at)
      from public.landing_autonomo_lead_contacts lc
      where lc.lead_id = l.id
    ) as last_contacted_at
  from leads_norm l
  where l.email is not null
    and l.estado in ('aceptado', 'rechazado', 'no_interesa')
    and not l.is_converted
)
select jsonb_build_object(
  'totalLeads', (select count(*) from leads_norm),

  'funnel', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'estado', e.estado,
      'count', coalesce(s.cnt, 0),
      'pct', case when total.cnt > 0 then (coalesce(s.cnt, 0)::numeric / total.cnt) * 100 else 0 end
    ) order by e.ord), '[]'::jsonb)
    from lead_estados e
    left join (select estado, count(*) as cnt from leads_norm group by estado) s on s.estado = e.estado
    cross join (select count(*) as cnt from leads_norm) total
  ),

  'convertedAnywayByEstado', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'estado', e.estado,
      'totalLeads', coalesce(s.total_leads, 0),
      'convertedCount', coalesce(s.converted_count, 0),
      'convertedPct', case
        when coalesce(s.total_leads, 0) > 0
          then (coalesce(s.converted_count, 0)::numeric / s.total_leads) * 100
        else 0
      end
    ) order by e.ord), '[]'::jsonb)
    from lead_estados e
    left join (
      select estado, count(*) as total_leads, count(*) filter (where is_converted) as converted_count
      from leads_norm
      group by estado
    ) s on s.estado = e.estado
  ),

  'byTipo', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'key', seg.key,
      'totalLeads', seg.total_leads,
      'convertedCount', seg.converted_count,
      'conversionRatePct', case when seg.total_leads > 0 then (seg.converted_count::numeric / seg.total_leads) * 100 else 0 end
    ) order by seg.total_leads desc), '[]'::jsonb)
    from (
      select coalesce(tipo, 'sin_dato') as key, count(*) as total_leads, count(*) filter (where is_converted) as converted_count
      from leads_norm
      group by coalesce(tipo, 'sin_dato')
    ) seg
  ),

  'byResidencia', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'key', seg.key,
      'totalLeads', seg.total_leads,
      'convertedCount', seg.converted_count,
      'conversionRatePct', case when seg.total_leads > 0 then (seg.converted_count::numeric / seg.total_leads) * 100 else 0 end
    ) order by seg.total_leads desc), '[]'::jsonb)
    from (
      select coalesce(residencia, 'sin_dato') as key, count(*) as total_leads, count(*) filter (where is_converted) as converted_count
      from leads_norm
      group by coalesce(residencia, 'sin_dato')
    ) seg
  ),

  'byCodigoCuota', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'key', seg.key,
      'totalLeads', seg.total_leads,
      'convertedCount', seg.converted_count,
      'conversionRatePct', case when seg.total_leads > 0 then (seg.converted_count::numeric / seg.total_leads) * 100 else 0 end
    ) order by seg.total_leads desc), '[]'::jsonb)
    from (
      select coalesce(codigo_cuota, 'sin_dato') as key, count(*) as total_leads, count(*) filter (where is_converted) as converted_count
      from leads_norm
      group by coalesce(codigo_cuota, 'sin_dato')
    ) seg
  ),

  'byFacturacionBucket', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'key', seg.key,
      'totalLeads', seg.total_leads,
      'convertedCount', seg.converted_count,
      'conversionRatePct', case when seg.total_leads > 0 then (seg.converted_count::numeric / seg.total_leads) * 100 else 0 end
    ) order by seg.total_leads desc), '[]'::jsonb)
    from (
      select coalesce(facturacion_bucket, 'sin_dato') as key, count(*) as total_leads, count(*) filter (where is_converted) as converted_count
      from leads_norm
      group by coalesce(facturacion_bucket, 'sin_dato')
    ) seg
  ),

  'lostAnnualValue', (select coalesce(sum(coalesce(total_mensual, 0) * 12), 0) from not_converted),

  'lostAnnualValueByEstado', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'estado', e.estado,
      'amount', coalesce(s.amount, 0)
    ) order by e.ord), '[]'::jsonb)
    from lead_estados e
    left join (
      select estado, sum(coalesce(total_mensual, 0) * 12) as amount
      from not_converted
      group by estado
    ) s on s.estado = e.estado
  ),

  'motivos', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'nombre', nombre,
      'email', email,
      'estado', estado,
      'motivo', motivo,
      'createdAt', created_at_text
    ) order by created_at desc), '[]'::jsonb)
    from leads_norm
    where motivo is not null
  ),

  'trend', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'periodKey', period_key,
      'count', cnt
    ) order by period_key asc), '[]'::jsonb)
    from (
      select
        to_char(created_at at time zone 'UTC', 'YYYY-MM-DD') as period_key,
        count(*) as cnt
      from leads_norm
      group by to_char(created_at at time zone 'UTC', 'YYYY-MM-DD')
    ) t
  ),

  'contactCandidates', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', id,
      'nombre', nombre,
      'email', email,
      'estado', estado,
      'totalMensual', total_mensual,
      'motivo', motivo,
      'lastContactedAt', case
        when last_contacted_at is null then null
        else to_char(last_contacted_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      end
    ) order by coalesce(total_mensual, -1) desc), '[]'::jsonb)
    from contactable
  )
);
$$;
