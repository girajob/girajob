-- Configurações da plataforma (ex.: taxa de serviço), gerenciadas pelo admin
create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
grant select on public.platform_settings to authenticated;
grant all on public.platform_settings to service_role;
alter table public.platform_settings enable row level security;
create policy "settings readable" on public.platform_settings for select to authenticated using (true);

-- Taxa percentual da plataforma sobre serviços (padrão 10% enquanto não configurada)
create or replace function public.service_fee_pct() returns numeric
language sql stable security definer set search_path=public as $$
  select coalesce((select (value#>>'{}')::numeric from public.platform_settings where key='service_fee_pct'), 10)
$$;
revoke execute on function public.service_fee_pct() from public, anon;
grant execute on function public.service_fee_pct() to authenticated;

create or replace function public.set_platform_setting(_key text, _value jsonb) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Sem permissão'; end if;
  insert into public.platform_settings(key,value,updated_by) values (_key,_value,auth.uid())
  on conflict (key) do update set value=excluded.value, updated_at=now(), updated_by=auth.uid();
  perform public.write_audit('setting_changed','platform_settings',null,jsonb_build_object('key',_key,'value',_value));
end $$;
revoke execute on function public.set_platform_setting(text,jsonb) from public, anon;
grant execute on function public.set_platform_setting(text,jsonb) to authenticated;

-- Registro de entrada do profissional via QR Code (check-in)
create or replace function public.check_in_booking(_token text)
returns table(booking_id uuid, job_title text, professional_name text, starts_at timestamptz, ends_at timestamptz, checked_in_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare t public.service_qr_tokens; b public.bookings;
begin
  select * into t from public.service_qr_tokens where token=_token;
  if not found or t.expires_at < now() then raise exception 'QR Code inválido ou expirado'; end if;
  select * into b from public.bookings where id=t.booking_id;
  if not public.owns_company(b.company_id) then raise exception 'Este QR Code não pertence à sua empresa'; end if;
  if b.status <> 'confirmed' then raise exception 'Contratação não está ativa'; end if;
  if b.checked_in_at is not null then raise exception 'Entrada já registrada anteriormente'; end if;
  update public.bookings set checked_in_at=now(), updated_at=now() where id=b.id;
  update public.service_qr_tokens set last_scanned_at=now(), scanned_by=auth.uid() where id=t.id;
  perform public.write_audit('check_in','booking',b.id,jsonb_build_object('job_id',b.job_id));
  return query select b.id, j.title, coalesce(p.full_name,'Profissional'), b.starts_at, b.ends_at, now()
    from public.jobs j, public.profiles p where j.id=b.job_id and p.id=b.professional_id;
end $$;
revoke execute on function public.check_in_booking(text) from public, anon;
grant execute on function public.check_in_booking(text) to authenticated;

-- Lista de pagamento de uma vaga (contratados + entradas + valores)
create or replace function public.job_payment_list(_job uuid)
returns table(booking_id uuid, professional_name text, booking_status booking_status, checked_in_at timestamptz, gross numeric, payment_id uuid, payment_status text, fee numeric, net numeric)
language plpgsql stable security definer set search_path=public as $$
declare j public.jobs;
begin
  select * into j from public.jobs where id=_job;
  if not found or not (public.owns_company(j.company_id) or public.has_role(auth.uid(),'admin')) then raise exception 'Sem permissão'; end if;
  return query
  select b.id, coalesce(p.full_name,'Profissional'), b.status, b.checked_in_at, j.pay_amount,
    pay.id, pay.status, pay.fee_amount, pay.net_amount
  from public.bookings b
  join public.profiles p on p.id=b.professional_id
  left join public.payments pay on pay.booking_id=b.id and pay.kind='service'
  where b.job_id=_job and b.status in ('confirmed','completed')
  order by p.full_name;
end $$;
revoke execute on function public.job_payment_list(uuid) from public, anon;
grant execute on function public.job_payment_list(uuid) to authenticated;

-- Gera a lista de pagamentos da vaga: só quem teve entrada validada; idempotente
create or replace function public.generate_payment_list(_job uuid) returns integer
language plpgsql security definer set search_path=public as $$
declare j public.jobs; n integer; fee_pct numeric;
begin
  select * into j from public.jobs where id=_job;
  if not found or not public.owns_company(j.company_id) then raise exception 'Sem permissão'; end if;
  fee_pct := public.service_fee_pct();
  insert into public.payments (kind, company_id, booking_id, gross_amount, fee_amount, net_amount, status, idempotency_key)
  select 'service', j.company_id, b.id, j.pay_amount,
    round(j.pay_amount * fee_pct / 100, 2),
    j.pay_amount - round(j.pay_amount * fee_pct / 100, 2),
    'pending', 'job:' || j.id::text || ':' || b.id::text
  from public.bookings b
  where b.job_id=j.id and b.status in ('confirmed','completed') and b.checked_in_at is not null
  on conflict (idempotency_key) do nothing;
  get diagnostics n = row_count;
  perform public.write_audit('payment_list_generated','job',j.id,jsonb_build_object('created',n));
  return n;
end $$;
revoke execute on function public.generate_payment_list(uuid) from public, anon;
grant execute on function public.generate_payment_list(uuid) to authenticated;

-- Visão financeira do admin
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
    'service_fee_pct', public.service_fee_pct()
  ));
end $$;
revoke execute on function public.admin_financial_stats() from public, anon;
grant execute on function public.admin_financial_stats() to authenticated;