-- ============================================================
-- Views de estatísticas — só leitura, calculadas na BD para não
-- transferir milhares de linhas para agregar em JS.
-- ============================================================

create or replace view stats_member_growth_by_month as
select
  date_trunc('month', joined_at) as month,
  count(*) as new_members,
  sum(count(*)) over (order by date_trunc('month', joined_at)) as cumulative_members
from members
where status <> 'revogado' -- crescimento líquido; revogados contam à parte
group by date_trunc('month', joined_at)
order by month;

create or replace view stats_membership_approval_rate as
select
  date_trunc('month', created_at) as month,
  count(*) filter (where status = 'aprovado') as approved,
  count(*) filter (where status = 'recusado') as rejected,
  count(*) filter (where status = 'pendente') as pending,
  round(
    100.0 * count(*) filter (where status = 'aprovado')
    / nullif(count(*) filter (where status in ('aprovado', 'recusado')), 0),
    1
  ) as approval_rate_pct
from membership_requests
group by date_trunc('month', created_at)
order by month;

create or replace view stats_concelhia_activity as
select
  c.id as concelhia_id,
  c.name as concelhia_name,
  d.name as district_name,
  c.active,
  count(m.id) filter (where m.status = 'ativo') as active_members,
  count(mr.id) filter (
    where mr.created_at > now() - interval '90 days'
  ) as requests_last_90_days
from concelhias c
join districts d on d.id = c.district_id
left join members m on m.concelhia_id = c.id
left join membership_requests mr on mr.concelhia_id = c.id
group by c.id, c.name, d.name, c.active
order by active_members desc;

create or replace view stats_district_summary as
select
  d.id as district_id,
  d.name as district_name,
  count(distinct c.id) as concelhia_count,
  count(distinct c.id) filter (where c.active) as active_concelhia_count,
  count(m.id) filter (where m.status = 'ativo') as active_members
from districts d
left join concelhias c on c.district_id = d.id
left join members m on m.concelhia_id = c.id
group by d.id, d.name
order by active_members desc;

-- estas views herdam automaticamente o RLS das tabelas subjacentes
-- (Postgres aplica RLS do dono das tabelas base em views simples),
-- mas por segurança explícita, restringimos o acesso também aqui:

alter view stats_member_growth_by_month owner to postgres;
alter view stats_membership_approval_rate owner to postgres;
alter view stats_concelhia_activity owner to postgres;
alter view stats_district_summary owner to postgres;

revoke all on stats_member_growth_by_month from authenticated, anon;
revoke all on stats_membership_approval_rate from authenticated, anon;
revoke all on stats_concelhia_activity from authenticated, anon;
revoke all on stats_district_summary from authenticated, anon;

-- só concedido a papéis com auth_is_national_staff() = true, verificado
-- na própria query via uma função wrapper (RPC) em vez de grant direto,
-- porque views não suportam RLS por linha diretamente:

create or replace function get_stats_member_growth()
returns setof stats_member_growth_by_month
language sql
security definer
stable
as $$
  select * from stats_member_growth_by_month where auth_is_national_staff();
$$;

create or replace function get_stats_approval_rate()
returns setof stats_membership_approval_rate
language sql
security definer
stable
as $$
  select * from stats_membership_approval_rate where auth_is_national_staff();
$$;

create or replace function get_stats_concelhia_activity()
returns setof stats_concelhia_activity
language sql
security definer
stable
as $$
  select * from stats_concelhia_activity where auth_is_national_staff();
$$;

create or replace function get_stats_district_summary()
returns setof stats_district_summary
language sql
security definer
stable
as $$
  select * from stats_district_summary where auth_is_national_staff();
$$;

grant execute on function get_stats_member_growth() to authenticated;
grant execute on function get_stats_approval_rate() to authenticated;
grant execute on function get_stats_concelhia_activity() to authenticated;
grant execute on function get_stats_district_summary() to authenticated;
