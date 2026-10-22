-- Endereço completo da empresa (preenchido via CEP + número/complemento)
alter table public.companies add column postal_code text;
alter table public.companies add column address_line text;
alter table public.companies add column address_number text;
alter table public.companies add column address_complement text;
alter table public.companies add column address_district text;

-- Receitas que o contratante registra em cada evento para análise de resultado
create table public.event_revenues (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  description text not null,
  amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.event_revenues to authenticated;
grant all on public.event_revenues to service_role;
alter table public.event_revenues enable row level security;
create policy "owner reads revenues" on public.event_revenues for select to authenticated
  using (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));
create index event_revenues_job_idx on public.event_revenues(job_id);

create or replace function public.add_event_revenue(_job uuid, _description text, _amount numeric) returns uuid
language plpgsql security definer set search_path=public as $$
declare j public.jobs; rid uuid;
begin
  select * into j from public.jobs where id=_job;
  if not found or not public.owns_company(j.company_id) then raise exception 'Sem permissão'; end if;
  if _amount <= 0 then raise exception 'Informe um valor maior que zero'; end if;
  if length(trim(_description)) < 2 then raise exception 'Descreva a receita'; end if;
  insert into public.event_revenues (job_id, company_id, description, amount)
  values (_job, j.company_id, trim(_description), _amount) returning id into rid;
  return rid;
end $$;
revoke execute on function public.add_event_revenue(uuid,text,numeric) from public, anon;
grant execute on function public.add_event_revenue(uuid,text,numeric) to authenticated;

create or replace function public.delete_event_revenue(_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare r public.event_revenues;
begin
  select * into r from public.event_revenues where id=_id;
  if not found or not public.owns_company(r.company_id) then raise exception 'Sem permissão'; end if;
  delete from public.event_revenues where id=_id;
end $$;
revoke execute on function public.delete_event_revenue(uuid) from public, anon;
grant execute on function public.delete_event_revenue(uuid) to authenticated;

-- Relatório de eventos do contratante: equipe, custos, receitas e resultado por evento
create or replace function public.contractor_events_report()
returns table(job_id uuid, title text, starts_at timestamptz, status job_status, positions integer,
  hired bigint, checkins bigint, labor_cost numeric, pro_payout numeric, fees numeric,
  revenue numeric, balance numeric)
language plpgsql stable security definer set search_path=public as $$
begin
  return query
  select j.id, j.title, j.starts_at, j.status, j.positions,
    (select count(*) from public.bookings b where b.job_id=j.id and b.status in ('confirmed','completed')),
    (select count(*) from public.bookings b where b.job_id=j.id and b.checked_in_at is not null),
    coalesce((select sum(nullif(p.total_charge,0)) from public.payments p where p.booking_id in (select b.id from public.bookings b where b.job_id=j.id) and p.kind='service'),
             (select sum(p.gross_amount) from public.payments p where p.booking_id in (select b.id from public.bookings b where b.job_id=j.id) and p.kind='service'), 0),
    coalesce((select sum(p.net_amount) from public.payments p where p.booking_id in (select b.id from public.bookings b where b.job_id=j.id) and p.kind='service'), 0),
    coalesce((select sum(p.fee_amount) from public.payments p where p.booking_id in (select b.id from public.bookings b where b.job_id=j.id) and p.kind='service'), 0),
    coalesce((select sum(r.amount) from public.event_revenues r where r.job_id=j.id), 0),
    coalesce((select sum(r.amount) from public.event_revenues r where r.job_id=j.id), 0)
      - coalesce((select sum(nullif(p.total_charge,0)) from public.payments p where p.booking_id in (select b.id from public.bookings b where b.job_id=j.id) and p.kind='service'),
                 (select sum(p.gross_amount) from public.payments p where p.booking_id in (select b.id from public.bookings b where b.job_id=j.id) and p.kind='service'), 0)
  from public.jobs j
  where public.owns_company(j.company_id) and j.status <> 'draft'
  order by j.starts_at desc;
end $$;
revoke execute on function public.contractor_events_report() from public, anon;
grant execute on function public.contractor_events_report() to authenticated;