
create type public.app_role as enum ('admin','contractor','professional');
create type public.profile_status as enum ('incomplete','pending_verification','approved','rejected','blocked');
create type public.job_status as enum ('draft','published','paused','closed','filled');
create type public.application_status as enum ('applied','in_review','approved','rejected','withdrawn','hired');
create type public.booking_status as enum ('confirmed','cancelled','completed','no_show');

create or replace function public.touch_updated_at() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at = now(); return new; end $$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  account_type public.app_role,
  birth_date date,
  address_line text,
  postal_code text,
  city text,
  state text,
  approx_lat numeric(6,2),
  approx_lng numeric(6,2),
  bio text,
  skills text[] not null default '{}',
  experience_years int check (experience_years between 0 and 80),
  onboarding_step int not null default 1,
  status public.profile_status not null default 'incomplete',
  verification_provider text,
  verification_ref text,
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create policy "read own profile" on public.profiles for select to authenticated
  using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "update own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
create policy "admin update profile" on public.profiles for update to authenticated
  using (public.has_role(auth.uid(),'admin'));
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.guard_profile_columns() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if current_setting('girajob.trusted', true) = 'on' then return new; end if;
  if auth.uid() is not null and not public.has_role(auth.uid(),'admin') then
    new.account_type := old.account_type;
    new.verification_provider := old.verification_provider;
    new.verification_ref := old.verification_ref;
    if new.status is distinct from old.status then
      if not (old.status = 'incomplete' and new.status = 'pending_verification') then
        new.status := old.status;
      end if;
    end if;
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile_columns();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'), new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  entity text not null,
  entity_id uuid,
  details jsonb not null default '{}',
  created_at timestamptz not null default now()
);
grant select on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
alter table public.audit_logs enable row level security;
create policy "admins read audit" on public.audit_logs for select to authenticated using (public.has_role(auth.uid(),'admin'));
create index on public.audit_logs (entity, entity_id);

create or replace function public.write_audit(_action text, _entity text, _id uuid, _details jsonb default '{}')
returns void language sql security definer set search_path=public as $$
  insert into public.audit_logs(actor_id, action, entity, entity_id, details) values (auth.uid(), _action, _entity, _id, _details);
$$;
revoke execute on function public.write_audit(text,text,uuid,jsonb) from public, anon, authenticated;

create or replace function public.choose_account_type(_type public.app_role) returns void
language plpgsql security definer set search_path=public as $$
declare cur public.app_role;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if _type not in ('contractor','professional') then raise exception 'invalid account type'; end if;
  select account_type into cur from public.profiles where id = auth.uid();
  if cur is not null then raise exception 'account type already chosen'; end if;
  perform set_config('girajob.trusted','on',true);
  update public.profiles set account_type = _type, onboarding_step = 1 where id = auth.uid();
  perform set_config('girajob.trusted','off',true);
  insert into public.user_roles(user_id, role) values (auth.uid(), _type) on conflict do nothing;
  perform public.write_audit('choose_account_type','profile',auth.uid(),jsonb_build_object('type',_type));
end $$;
revoke execute on function public.choose_account_type(public.app_role) from public, anon;
grant execute on function public.choose_account_type(public.app_role) to authenticated;

create table public.professional_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.professional_categories to anon, authenticated;
grant insert, update, delete on public.professional_categories to authenticated;
grant all on public.professional_categories to service_role;
alter table public.professional_categories enable row level security;
create policy "categories readable" on public.professional_categories for select to anon, authenticated using (true);
create policy "admins manage categories" on public.professional_categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger cat_touch before update on public.professional_categories for each row execute function public.touch_updated_at();

create table public.professional_categories_map (
  professional_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.professional_categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (professional_id, category_id)
);
grant select, insert, delete on public.professional_categories_map to authenticated;
grant all on public.professional_categories_map to service_role;
alter table public.professional_categories_map enable row level security;
create policy "own category map" on public.professional_categories_map for all to authenticated
  using (professional_id = auth.uid() or public.has_role(auth.uid(),'admin'))
  with check (professional_id = auth.uid());

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (length(name) between 2 and 120),
  document text,
  phone text,
  city text,
  state text,
  description text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id)
);
grant select, insert, update on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
create policy "companies readable" on public.companies for select to authenticated using (true);
create policy "owner inserts company" on public.companies for insert to authenticated
  with check (owner_id = auth.uid() and public.has_role(auth.uid(),'contractor'));
create policy "owner updates company" on public.companies for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create trigger comp_touch before update on public.companies for each row execute function public.touch_updated_at();

create or replace function public.owns_company(_company uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.companies where id = _company and owner_id = auth.uid())
$$;

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  category_id uuid references public.professional_categories(id),
  title text not null check (length(title) between 3 and 120),
  description text not null default '',
  venue_name text not null default '',
  positions int not null default 1 check (positions between 1 and 500),
  address text,
  city text not null,
  state text not null,
  approx_lat numeric(6,2),
  approx_lng numeric(6,2),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  pay_amount numeric(10,2) not null check (pay_amount >= 0),
  requirements text,
  benefits text,
  application_deadline timestamptz,
  banner_url text,
  status public.job_status not null default 'draft',
  published_at timestamptz,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (ends_at - starts_at <= interval '24 hours')
);
grant select, insert, update, delete on public.jobs to authenticated;
grant all on public.jobs to service_role;
alter table public.jobs enable row level security;
create index on public.jobs (status, starts_at);
create index on public.jobs (company_id);
create index on public.jobs (city);
create policy "visible jobs" on public.jobs for select to authenticated
  using (status <> 'draft' or public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));
create policy "owner insert jobs" on public.jobs for insert to authenticated
  with check (public.owns_company(company_id) and public.has_role(auth.uid(),'contractor'));
create policy "owner update jobs" on public.jobs for update to authenticated
  using (public.owns_company(company_id)) with check (public.owns_company(company_id));
create policy "owner delete draft jobs" on public.jobs for delete to authenticated
  using (public.owns_company(company_id) and status = 'draft');
create trigger jobs_touch before update on public.jobs for each row execute function public.touch_updated_at();

create or replace function public.validate_job() returns trigger language plpgsql set search_path=public as $$
begin
  if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    if new.starts_at <= now() then raise exception 'A data de início deve estar no futuro'; end if;
    if new.application_deadline is not null and new.application_deadline > new.starts_at then
      raise exception 'O prazo de candidatura deve ser antes do início'; end if;
    if new.published_at is null then new.published_at := now(); end if;
  end if;
  if tg_op = 'UPDATE' and old.status = 'closed' and new.status <> 'closed' then
    raise exception 'Vaga encerrada não pode ser reaberta';
  end if;
  return new;
end $$;
create trigger jobs_validate before insert or update on public.jobs for each row execute function public.validate_job();

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  status public.application_status not null default 'applied',
  message text check (length(message) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, professional_id)
);
grant select on public.applications to authenticated;
grant all on public.applications to service_role;
alter table public.applications enable row level security;
create index on public.applications (professional_id);
create policy "read own or company applications" on public.applications for select to authenticated
  using (professional_id = auth.uid()
    or exists(select 1 from public.jobs j where j.id = job_id and public.owns_company(j.company_id))
    or public.has_role(auth.uid(),'admin'));
create trigger app_touch before update on public.applications for each row execute function public.touch_updated_at();

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null unique references public.applications(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  professional_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'confirmed',
  checked_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create index on public.bookings (professional_id, starts_at);
create policy "read own bookings" on public.bookings for select to authenticated
  using (professional_id = auth.uid() or public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));
create trigger book_touch before update on public.bookings for each row execute function public.touch_updated_at();

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  reviewer_id uuid not null default auth.uid(),
  reviewee_id uuid not null,
  rating int not null check (rating between 1 and 5),
  comment text check (length(comment) <= 1000),
  created_at timestamptz not null default now(),
  unique (booking_id, reviewer_id)
);
grant select, insert on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews readable" on public.reviews for select to authenticated using (true);
create policy "participants review" on public.reviews for insert to authenticated with check (
  reviewer_id = auth.uid() and exists (select 1 from public.bookings b where b.id = booking_id
    and b.status = 'completed'
    and ((b.professional_id = auth.uid() and reviewee_id = (select owner_id from public.companies c where c.id=b.company_id))
      or (public.owns_company(b.company_id) and reviewee_id = b.professional_id))));

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  plan text not null,
  status text not null default 'pending' check (status in ('pending','active','past_due','cancelled')),
  amount numeric(10,2) not null default 0,
  provider text,
  provider_ref text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "owner reads subs" on public.subscriptions for select to authenticated using (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('subscription','service')),
  company_id uuid not null references public.companies(id) on delete cascade,
  subscription_id uuid references public.subscriptions(id),
  booking_id uuid references public.bookings(id),
  method text check (method in ('pix','boleto','card')),
  gross_amount numeric(10,2) not null default 0,
  fee_amount numeric(10,2) not null default 0,
  net_amount numeric(10,2) not null default 0,
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded','cancelled')),
  provider text,
  provider_ref text unique,
  idempotency_key text unique,
  reconciled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "owner reads payments" on public.payments for select to authenticated using (public.owns_company(company_id) or public.has_role(auth.uid(),'admin'));

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "mark own read" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create index on public.notifications (user_id, created_at desc);

create or replace function public.notify(_user uuid, _title text, _body text, _link text) returns void
language sql security definer set search_path=public as $$
  insert into public.notifications(user_id,title,body,link) values (_user,_title,_body,_link);
$$;
revoke execute on function public.notify(uuid,text,text,text) from public, anon, authenticated;

create table public.job_analytics_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.jobs(id) on delete cascade,
  actor_id uuid not null,
  event_type text not null check (event_type in ('view','click','apply_started','apply_completed','hire_confirmed')),
  event_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (job_id, actor_id, event_type, event_date)
);
grant select on public.job_analytics_events to authenticated;
grant all on public.job_analytics_events to service_role;
alter table public.job_analytics_events enable row level security;
create policy "company reads events" on public.job_analytics_events for select to authenticated
  using (exists(select 1 from public.jobs j where j.id = job_id and public.owns_company(j.company_id)) or public.has_role(auth.uid(),'admin'));

create or replace function public.track_job_event(_job uuid, _type text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then return; end if;
  if _type not in ('view','click','apply_started') then raise exception 'invalid event'; end if;
  if exists(select 1 from public.jobs j where j.id=_job and public.owns_company(j.company_id)) then return; end if;
  insert into public.job_analytics_events(job_id, actor_id, event_type) values (_job, auth.uid(), _type)
  on conflict do nothing;
end $$;
revoke execute on function public.track_job_event(uuid,text) from public, anon;
grant execute on function public.track_job_event(uuid,text) to authenticated;

create table public.service_qr_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(24),'hex'),
  expires_at timestamptz not null,
  last_scanned_at timestamptz,
  scanned_by uuid,
  created_at timestamptz not null default now()
);
grant all on public.service_qr_tokens to service_role;
alter table public.service_qr_tokens enable row level security;

create or replace function public.apply_to_job(_job uuid, _message text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare j public.jobs; p public.profiles; new_id uuid;
begin
  if auth.uid() is null then raise exception 'Faça login para se candidatar'; end if;
  if not public.has_role(auth.uid(),'professional') then raise exception 'Apenas profissionais podem se candidatar'; end if;
  select * into p from public.profiles where id = auth.uid();
  if p.status in ('blocked','rejected') then raise exception 'Seu cadastro não permite candidaturas'; end if;
  if p.status = 'incomplete' then raise exception 'Conclua seu cadastro antes de se candidatar'; end if;
  select * into j from public.jobs where id = _job for share;
  if not found or j.status <> 'published' then raise exception 'Esta vaga não está aceitando candidaturas'; end if;
  if j.application_deadline is not null and j.application_deadline < now() then raise exception 'O prazo de candidatura terminou'; end if;
  if j.starts_at <= now() then raise exception 'Esta vaga já começou'; end if;
  insert into public.applications(job_id, professional_id, message) values (_job, auth.uid(), nullif(trim(_message),''))
    on conflict (job_id, professional_id) do update set status = 'applied', message = excluded.message
      where applications.status = 'withdrawn'
    returning id into new_id;
  if new_id is null then raise exception 'Você já se candidatou a esta vaga'; end if;
  insert into public.job_analytics_events(job_id, actor_id, event_type) values (_job, auth.uid(), 'apply_completed') on conflict do nothing;
  perform public.notify((select owner_id from public.companies where id=j.company_id), 'Nova candidatura', j.title, '/contratante/vagas/'||j.id);
  return new_id;
end $$;
revoke execute on function public.apply_to_job(uuid,text) from public, anon;
grant execute on function public.apply_to_job(uuid,text) to authenticated;

create or replace function public.withdraw_application(_app uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
  update public.applications set status='withdrawn'
   where id=_app and professional_id=auth.uid() and status in ('applied','in_review','approved');
  if not found then raise exception 'Não é possível retirar esta candidatura'; end if;
end $$;
revoke execute on function public.withdraw_application(uuid) from public, anon;
grant execute on function public.withdraw_application(uuid) to authenticated;

create or replace function public.set_application_status(_app uuid, _status public.application_status) returns void
language plpgsql security definer set search_path=public as $$
declare a public.applications; j public.jobs;
begin
  if _status not in ('in_review','approved','rejected') then raise exception 'Status inválido'; end if;
  select * into a from public.applications where id=_app for update;
  if not found then raise exception 'Candidatura não encontrada'; end if;
  select * into j from public.jobs where id=a.job_id;
  if not public.owns_company(j.company_id) then raise exception 'Sem permissão'; end if;
  if a.status in ('hired','withdrawn') then raise exception 'Esta candidatura não pode ser alterada'; end if;
  update public.applications set status=_status where id=_app;
  perform public.write_audit('application_status','application',_app,jsonb_build_object('status',_status));
  perform public.notify(a.professional_id, 'Candidatura atualizada', j.title, '/profissional/candidaturas');
end $$;
revoke execute on function public.set_application_status(uuid,public.application_status) from public, anon;
grant execute on function public.set_application_status(uuid,public.application_status) to authenticated;

create or replace function public.confirm_hire(_app uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare a public.applications; j public.jobs; hired int; b_id uuid;
begin
  select * into a from public.applications where id=_app for update;
  if not found then raise exception 'Candidatura não encontrada'; end if;
  select * into j from public.jobs where id=a.job_id for update;
  if not public.owns_company(j.company_id) then raise exception 'Sem permissão'; end if;
  if a.status <> 'approved' then raise exception 'Aprove a candidatura antes de contratar'; end if;
  if j.status not in ('published','paused') then raise exception 'Vaga não está ativa'; end if;
  perform pg_advisory_xact_lock(hashtext(a.professional_id::text));
  select count(*) into hired from public.bookings where job_id=j.id and status <> 'cancelled';
  if hired >= j.positions then raise exception 'Todas as vagas já foram preenchidas'; end if;
  if exists (select 1 from public.bookings b where b.professional_id=a.professional_id and b.status='confirmed'
             and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(j.starts_at,j.ends_at,'[)')) then
    raise exception 'O profissional já tem uma contratação confirmada nesse horário';
  end if;
  insert into public.bookings(application_id, job_id, professional_id, company_id, starts_at, ends_at)
    values (a.id, j.id, a.professional_id, j.company_id, j.starts_at, j.ends_at) returning id into b_id;
  update public.applications set status='hired' where id=a.id;
  insert into public.service_qr_tokens(booking_id, expires_at) values (b_id, j.ends_at + interval '6 hours');
  insert into public.job_analytics_events(job_id, actor_id, event_type) values (j.id, a.professional_id, 'hire_confirmed') on conflict do nothing;
  if hired + 1 >= j.positions then update public.jobs set status='filled' where id=j.id; end if;
  perform public.write_audit('confirm_hire','booking',b_id,jsonb_build_object('application',a.id));
  perform public.notify(a.professional_id, 'Contratação confirmada!', j.title, '/profissional/agenda');
  return b_id;
end $$;
revoke execute on function public.confirm_hire(uuid) from public, anon;
grant execute on function public.confirm_hire(uuid) to authenticated;

create or replace function public.job_applicants(_job uuid)
returns table(application_id uuid, professional_id uuid, full_name text, avatar_url text, city text, state text,
  distance_km numeric, categories text[], avg_rating numeric, status public.application_status, message text, created_at timestamptz,
  has_conflict boolean)
language plpgsql stable security definer set search_path=public as $$
declare j public.jobs;
begin
  select * into j from public.jobs where id=_job;
  if not found or not (public.owns_company(j.company_id) or public.has_role(auth.uid(),'admin')) then raise exception 'Sem permissão'; end if;
  return query
  select a.id, p.id, p.full_name, p.avatar_url, p.city, p.state,
    case when p.approx_lat is null or j.approx_lat is null then null else
      round((6371 * acos(least(1, cos(radians(p.approx_lat))*cos(radians(j.approx_lat))*cos(radians(j.approx_lng)-radians(p.approx_lng)) + sin(radians(p.approx_lat))*sin(radians(j.approx_lat)))))::numeric, 0) end,
    coalesce((select array_agg(c.name order by c.name) from public.professional_categories_map m join public.professional_categories c on c.id=m.category_id where m.professional_id=p.id), '{}'::text[]),
    (select round(avg(r.rating)::numeric,1) from public.reviews r where r.reviewee_id=p.id),
    a.status, a.message, a.created_at,
    exists(select 1 from public.bookings b where b.professional_id=p.id and b.status='confirmed' and b.job_id<>j.id
      and tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(j.starts_at,j.ends_at,'[)'))
  from public.applications a join public.profiles p on p.id=a.professional_id
  where a.job_id=_job and a.status <> 'withdrawn'
  order by a.created_at;
end $$;
revoke execute on function public.job_applicants(uuid) from public, anon;
grant execute on function public.job_applicants(uuid) to authenticated;

create or replace function public.get_booking_qr(_booking uuid) returns text
language sql stable security definer set search_path=public as $$
  select t.token from public.service_qr_tokens t join public.bookings b on b.id=t.booking_id
  where b.id=_booking and b.professional_id=auth.uid() and b.status='confirmed' and t.expires_at > now()
$$;
revoke execute on function public.get_booking_qr(uuid) from public, anon;
grant execute on function public.get_booking_qr(uuid) to authenticated;

create or replace function public.verify_qr_token(_token text)
returns table(booking_id uuid, job_title text, professional_name text, starts_at timestamptz, ends_at timestamptz)
language plpgsql security definer set search_path=public as $$
declare t public.service_qr_tokens; b public.bookings;
begin
  select * into t from public.service_qr_tokens where token=_token;
  if not found or t.expires_at < now() then raise exception 'QR Code inválido ou expirado'; end if;
  select * into b from public.bookings where id=t.booking_id;
  if not public.owns_company(b.company_id) then raise exception 'Este QR Code não pertence à sua empresa'; end if;
  if b.status <> 'confirmed' then raise exception 'Contratação não está ativa'; end if;
  update public.service_qr_tokens set last_scanned_at=now(), scanned_by=auth.uid() where id=t.id;
  perform public.write_audit('qr_scanned','booking',b.id,'{}');
  return query select b.id, j.title, split_part(coalesce(p.full_name,'Profissional'),' ',1), b.starts_at, b.ends_at
    from public.jobs j, public.profiles p where j.id=b.job_id and p.id=b.professional_id;
end $$;
revoke execute on function public.verify_qr_token(text) from public, anon;
grant execute on function public.verify_qr_token(text) to authenticated;

create or replace function public.admin_stats(_city text default null, _state text default null, _from timestamptz default null, _to timestamptz default null)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare r jsonb;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Sem permissão'; end if;
  select jsonb_build_object(
    'users', (select count(*) from public.profiles p where (_city is null or p.city ilike _city) and (_state is null or p.state = _state) and (_from is null or p.created_at >= _from) and (_to is null or p.created_at < _to)),
    'contractors', (select count(*) from public.profiles p where account_type='contractor' and (_city is null or p.city ilike _city) and (_state is null or p.state=_state) and (_from is null or p.created_at >= _from) and (_to is null or p.created_at < _to)),
    'professionals', (select count(*) from public.profiles p where account_type='professional' and (_city is null or p.city ilike _city) and (_state is null or p.state=_state) and (_from is null or p.created_at >= _from) and (_to is null or p.created_at < _to)),
    'jobs_published', (select count(*) from public.jobs j where status <> 'draft' and not is_demo and (_city is null or j.city ilike _city) and (_state is null or j.state=_state) and (_from is null or j.created_at >= _from) and (_to is null or j.created_at < _to)),
    'applications', (select count(*) from public.applications a join public.jobs j on j.id=a.job_id where (_city is null or j.city ilike _city) and (_state is null or j.state=_state) and (_from is null or a.created_at >= _from) and (_to is null or a.created_at < _to)),
    'bookings', (select count(*) from public.bookings b join public.jobs j on j.id=b.job_id where b.status <> 'cancelled' and (_city is null or j.city ilike _city) and (_state is null or j.state=_state) and (_from is null or b.created_at >= _from) and (_to is null or b.created_at < _to)),
    'jobs_by_status', (select coalesce(jsonb_object_agg(status, n),'{}'::jsonb) from (select j.status, count(*) n from public.jobs j where (_city is null or j.city ilike _city) and (_state is null or j.state=_state) and (_from is null or j.created_at >= _from) and (_to is null or j.created_at < _to) group by j.status) s)
  ) into r;
  return r;
end $$;
revoke execute on function public.admin_stats(text,text,timestamptz,timestamptz) from public, anon;
grant execute on function public.admin_stats(text,text,timestamptz,timestamptz) to authenticated;

create or replace function public.admin_list_users(_search text default null)
returns table(id uuid, full_name text, account_type public.app_role, status public.profile_status, city text, state text, created_at timestamptz, is_admin boolean)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Sem permissão'; end if;
  return query select p.id, p.full_name, p.account_type, p.status, p.city, p.state, p.created_at, public.has_role(p.id,'admin')
    from public.profiles p where _search is null or p.full_name ilike '%'||_search||'%' or p.city ilike '%'||_search||'%'
    order by p.created_at desc limit 200;
end $$;
revoke execute on function public.admin_list_users(text) from public, anon;
grant execute on function public.admin_list_users(text) to authenticated;

create or replace function public.admin_set_profile_status(_user uuid, _status public.profile_status) returns void
language plpgsql security definer set search_path=public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Sem permissão'; end if;
  update public.profiles set status=_status where id=_user;
  perform public.write_audit('admin_set_status','profile',_user,jsonb_build_object('status',_status));
end $$;
revoke execute on function public.admin_set_profile_status(uuid,public.profile_status) from public, anon;
grant execute on function public.admin_set_profile_status(uuid,public.profile_status) to authenticated;

create policy "media public read" on storage.objects for select using (bucket_id in ('avatars','banners'));
create policy "media own write" on storage.objects for insert to authenticated
  with check (bucket_id in ('avatars','banners') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "media own update" on storage.objects for update to authenticated
  using (bucket_id in ('avatars','banners') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "documents own read" on storage.objects for select to authenticated
  using (bucket_id = 'documents' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));
create policy "documents own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);
