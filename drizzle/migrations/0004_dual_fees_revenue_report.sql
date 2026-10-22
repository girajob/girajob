-- Taxas separadas: descontada do profissional e cobrada do contratante
alter table public.payments add column pro_fee_amount numeric(10,2) not null default 0;
alter table public.payments add column contractor_fee_amount numeric(10,2) not null default 0;
alter table public.payments add column total_charge numeric(10,2) not null default 0;

-- Percentual cobrado do contratante sobre o serviço (padrão 0% enquanto não configurado)
create or replace function public.contractor_fee_pct() returns numeric
language sql stable security definer set search_path=public as $$
  select coalesce((select (value#>>'{}')::numeric from public.platform_settings where key='contractor_fee_pct'), 0)
$$;
revoke execute on function public.contractor_fee_pct() from public, anon;
grant execute on function public.contractor_fee_pct() to authenticated;

-- Geração da lista agora calcula as duas taxas e o total a cobrar do contratante
create or replace function public.generate_payment_list(_job uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare j public.jobs; n integer; pro_pct numeric; con_pct numeric;
begin
  select * into j from public.jobs where id=_job;
  if not found or not public.owns_company(j.company_id) then raise exception 'Sem permissão'; end if;
  pro_pct := public.service_fee_pct();
  con_pct := public.contractor_fee_pct();
  insert into public.payments (kind, company_id, booking_id, gross_amount, fee_amount, net_amount, status, idempotency_key, pro_fee_amount, contractor_fee_amount, total_charge)
  select 'service', j.company_id, b.id, j.pay_amount,
    round(j.pay_amount * pro_pct / 100, 2) + round(j.pay_amount * con_pct / 100, 2),
    j.pay_amount - round(j.pay_amount * pro_pct / 100, 2),
    'pending', 'job:' || j.id::text || ':' || b.id::text,
    round(j.pay_amount * pro_pct / 100, 2),
    round(j.pay_amount * con_pct / 100, 2),
    j.pay_amount + round(j.pay_amount * con_pct / 100, 2)
  from public.bookings b
  where b.job_id=j.id and b.status in ('confirmed','completed') and b.checked_in_at is not null
  on conflict (idempotency_key) do nothing;
  get diagnostics n = row_count;
  perform public.write_audit('payment_list_generated','job',j.id,jsonb_build_object('created',n));
  return n;
end $$;

-- Lista de pagamento da vaga passa a expor as duas taxas e o total cobrado
drop function public.job_payment_list(uuid);
create function public.job_payment_list(_job uuid)
returns table(booking_id uuid, professional_name text, booking_status booking_status, checked_in_at timestamptz, gross numeric, payment_id uuid, payment_status text, fee numeric, net numeric, pro_fee numeric, contractor_fee numeric, total_charge numeric)
language plpgsql stable security definer set search_path=public as $$
declare j public.jobs;
begin
  select * into j from public.jobs where id=_job;
  if not found or not (public.owns_company(j.company_id) or public.has_role(auth.uid(),'admin')) then raise exception 'Sem permissão'; end if;
  return query
  select b.id, coalesce(p.full_name,'Profissional'), b.status, b.checked_in_at, j.pay_amount,
    pay.id, pay.status, pay.fee_amount, pay.net_amount, pay.pro_fee_amount, pay.contractor_fee_amount, pay.total_charge
  from public.bookings b
  join public.profiles p on p.id=b.professional_id
  left join public.payments pay on pay.booking_id=b.id and pay.kind='service'
  where b.job_id=_job and b.status in ('confirmed','completed')
  order by p.full_name;
end $$;
revoke execute on function public.job_payment_list(uuid) from public, anon;
grant execute on function public.job_payment_list(uuid) to authenticated;

-- Visão financeira do admin inclui as duas taxas configuradas
create or replace function public.admin_financial_stats() returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Sem permissão'; end if;
  return (select jsonb_build_object(
    'payments_by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.payments group by status) s),'{}'::jsonb),
    'gross_pending', coalesce((select sum(gross_amount) from public.payments where status='pending'),0),
    'gross_paid', coalesce((select sum(gross_amount) from public.payments where status='paid'),0),
    'fees_paid', coalesce((select sum(fee_amount) from public.payments where status='paid'),0),
    'subscriptions_by_status', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from public.subscriptions group by status) s),'{}'::jsonb),
    'service_fee_pct', public.service_fee_pct(),
    'contractor_fee_pct', public.contractor_fee_pct()
  ));
end $$;

-- Relatório de receitas da plataforma por período
create or replace function public.admin_revenue_report(_from timestamptz default null, _to timestamptz default null) returns jsonb
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Sem permissão'; end if;
  return (select jsonb_build_object(
    'gmv', coalesce((select sum(gross_amount) from public.payments p where p.kind='service' and (_from is null or p.created_at >= _from) and (_to is null or p.created_at < _to)),0),
    'revenue', coalesce((select sum(fee_amount) from public.payments p where (_from is null or p.created_at >= _from) and (_to is null or p.created_at < _to)),0),
    'revenue_pending', coalesce((select sum(fee_amount) from public.payments p where p.status='pending' and (_from is null or p.created_at >= _from) and (_to is null or p.created_at < _to)),0),
    'revenue_paid', coalesce((select sum(fee_amount) from public.payments p where p.status='paid' and (_from is null or p.created_at >= _from) and (_to is null or p.created_at < _to)),0),
    'pro_fees', coalesce((select sum(pro_fee_amount) from public.payments p where (_from is null or p.created_at >= _from) and (_to is null or p.created_at < _to)),0),
    'contractor_fees', coalesce((select sum(contractor_fee_amount) from public.payments p where (_from is null or p.created_at >= _from) and (_to is null or p.created_at < _to)),0),
    'payments_count', (select count(*) from public.payments p where (_from is null or p.created_at >= _from) and (_to is null or p.created_at < _to)),
    'checkins', (select count(*) from public.bookings b where b.checked_in_at is not null and (_from is null or b.checked_in_at >= _from) and (_to is null or b.checked_in_at < _to)),
    'bookings', (select count(*) from public.bookings b where b.status <> 'cancelled' and (_from is null or b.created_at >= _from) and (_to is null or b.created_at < _to)),
    'by_company', coalesce((select jsonb_agg(jsonb_build_object('name', t.name, 'gmv', t.gmv, 'revenue', t.revenue, 'n', t.n) order by t.revenue desc) from (
      select c.name, sum(p.gross_amount) gmv, sum(p.fee_amount) revenue, count(*) n
      from public.payments p join public.companies c on c.id=p.company_id
      where (_from is null or p.created_at >= _from) and (_to is null or p.created_at < _to)
      group by c.name limit 10) t),'[]'::jsonb)
  ));
end $$;
revoke execute on function public.admin_revenue_report(timestamptz,timestamptz) from public, anon;
grant execute on function public.admin_revenue_report(timestamptz,timestamptz) to authenticated;