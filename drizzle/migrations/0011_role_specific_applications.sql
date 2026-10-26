ALTER TABLE public.applications ADD COLUMN job_role_id uuid REFERENCES public.job_roles(id);
ALTER TABLE public.bookings ADD COLUMN job_role_id uuid REFERENCES public.job_roles(id), ADD COLUMN role_label text, ADD COLUMN pay_amount numeric;
CREATE INDEX applications_job_role_idx ON public.applications(job_role_id);
CREATE INDEX bookings_job_role_idx ON public.bookings(job_role_id);

CREATE FUNCTION public.role_starts_at(_starts timestamptz, _entry time) RETURNS timestamptz LANGUAGE sql IMMUTABLE SET search_path=public AS $$ SELECT CASE WHEN _entry IS NULL THEN _starts ELSE (((_starts AT TIME ZONE 'America/Sao_Paulo')::date + _entry) AT TIME ZONE 'America/Sao_Paulo') END $$;

CREATE FUNCTION public.apply_to_job_role(_job uuid, _role uuid DEFAULT NULL, _message text DEFAULT NULL) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE j public.jobs; p public.profiles; r public.job_roles; new_id uuid; s timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'professional') THEN RAISE EXCEPTION 'Apenas profissionais podem se candidatar'; END IF;
 SELECT * INTO p FROM public.profiles WHERE id=auth.uid();
 IF p.status IN ('blocked','rejected','incomplete') THEN RAISE EXCEPTION 'Conclua seu cadastro ou verifique sua aprovação'; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=_job FOR UPDATE;
 IF NOT FOUND OR j.status<>'published' THEN RAISE EXCEPTION 'Esta vaga não está aceitando candidaturas'; END IF;
 IF j.application_deadline < now() THEN RAISE EXCEPTION 'O prazo de candidatura terminou'; END IF;
 IF EXISTS(SELECT 1 FROM public.job_roles WHERE job_id=_job) AND _role IS NULL THEN RAISE EXCEPTION 'Escolha o cargo para se candidatar'; END IF;
 s:=j.starts_at;
 IF _role IS NOT NULL THEN
  SELECT * INTO r FROM public.job_roles WHERE id=_role AND job_id=_job;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cargo não pertence a este evento'; END IF;
  s:=public.role_starts_at(j.starts_at,r.entry_time);
  IF (SELECT count(*) FROM public.bookings WHERE job_role_id=r.id AND status<>'cancelled')>=r.positions THEN RAISE EXCEPTION 'As vagas deste cargo já foram preenchidas'; END IF;
 END IF;
 IF s<=now() OR s>=j.ends_at THEN RAISE EXCEPTION 'Este cargo já começou ou tem horário inválido'; END IF;
 INSERT INTO public.applications(job_id,professional_id,job_role_id,message) VALUES(_job,auth.uid(),_role,nullif(trim(_message),''))
 ON CONFLICT(job_id,professional_id) DO UPDATE SET status='applied',job_role_id=excluded.job_role_id,message=excluded.message WHERE applications.status='withdrawn' RETURNING id INTO new_id;
 IF new_id IS NULL THEN RAISE EXCEPTION 'Você já se candidatou a este evento'; END IF;
 INSERT INTO public.job_analytics_events(job_id,actor_id,event_type) VALUES(_job,auth.uid(),'apply_completed') ON CONFLICT DO NOTHING;
 PERFORM public.notify((SELECT owner_id FROM public.companies WHERE id=j.company_id),'Nova candidatura',j.title || coalesce(' · '||r.label,''),'/contratante/vagas/'||j.id);
 RETURN new_id;
END $$;
CREATE OR REPLACE FUNCTION public.apply_to_job(_job uuid,_message text DEFAULT NULL) RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$ SELECT public.apply_to_job_role(_job,NULL,_message) $$;

CREATE OR REPLACE FUNCTION public.confirm_hire(_app uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a public.applications; j public.jobs; r public.job_roles; hired int; b_id uuid; s timestamptz; amount numeric;
BEGIN
 SELECT * INTO a FROM public.applications WHERE id=_app;
 IF NOT FOUND THEN RAISE EXCEPTION 'Candidatura não encontrada'; END IF;
 SELECT * INTO j FROM public.jobs WHERE id=a.job_id FOR UPDATE;
 IF NOT public.owns_company(j.company_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 SELECT * INTO a FROM public.applications WHERE id=_app FOR UPDATE;
 IF a.status<>'approved' THEN RAISE EXCEPTION 'Aprove a candidatura antes de contratar'; END IF;
 IF j.status NOT IN ('published','paused') THEN RAISE EXCEPTION 'Vaga não está ativa'; END IF;
 s:=j.starts_at; amount:=j.pay_amount;
 IF a.job_role_id IS NOT NULL THEN
  SELECT * INTO r FROM public.job_roles WHERE id=a.job_role_id AND job_id=j.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cargo não encontrado'; END IF;
  IF (SELECT count(*) FROM public.bookings WHERE job_role_id=r.id AND status<>'cancelled')>=r.positions THEN RAISE EXCEPTION 'As vagas deste cargo já foram preenchidas'; END IF;
  s:=public.role_starts_at(j.starts_at,r.entry_time); amount:=r.pay_amount;
 END IF;
 IF s>=j.ends_at THEN RAISE EXCEPTION 'Horário do cargo inválido'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(a.professional_id::text));
 SELECT count(*) INTO hired FROM public.bookings WHERE job_id=j.id AND status<>'cancelled';
 IF hired>=j.positions THEN RAISE EXCEPTION 'Todas as vagas já foram preenchidas'; END IF;
 IF EXISTS(SELECT 1 FROM public.bookings b WHERE b.professional_id=a.professional_id AND b.status='confirmed' AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(s,j.ends_at,'[)')) THEN RAISE EXCEPTION 'O profissional já tem uma contratação confirmada nesse horário'; END IF;
 INSERT INTO public.bookings(application_id,job_id,professional_id,company_id,starts_at,ends_at,job_role_id,role_label,pay_amount) VALUES(a.id,j.id,a.professional_id,j.company_id,s,j.ends_at,a.job_role_id,r.label,amount) RETURNING id INTO b_id;
 UPDATE public.applications SET status='hired' WHERE id=a.id;
 INSERT INTO public.service_qr_tokens(booking_id,expires_at) VALUES(b_id,j.ends_at+interval '6 hours');
 INSERT INTO public.job_analytics_events(job_id,actor_id,event_type) VALUES(j.id,a.professional_id,'hire_confirmed') ON CONFLICT DO NOTHING;
 IF hired+1>=j.positions THEN UPDATE public.jobs SET status='filled' WHERE id=j.id; END IF;
 PERFORM public.write_audit('confirm_hire','booking',b_id,jsonb_build_object('application',a.id,'role',a.job_role_id));
 PERFORM public.notify(a.professional_id,'Contratação confirmada!',j.title||coalesce(' · '||r.label,''),'/profissional/agenda');
 RETURN b_id;
END $$;

CREATE FUNCTION public.guard_linked_job_role() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM public.jobs WHERE id=OLD.job_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.applications WHERE job_role_id=OLD.id AND status<>'withdrawn') THEN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Este cargo tem candidaturas e não pode ser removido'; END IF;
  IF (NEW.label,NEW.pay_amount,NEW.entry_time,NEW.category_id,NEW.job_id) IS DISTINCT FROM (OLD.label,OLD.pay_amount,OLD.entry_time,OLD.category_id,OLD.job_id) THEN RAISE EXCEPTION 'Este cargo tem candidaturas; mantenha nome, valor e horário'; END IF;
 END IF;
 IF TG_OP='UPDATE' AND NEW.positions<(SELECT count(*) FROM public.bookings WHERE job_role_id=OLD.id AND status<>'cancelled') THEN RAISE EXCEPTION 'Quantidade menor que os contratados'; END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER guard_linked_job_role BEFORE UPDATE OR DELETE ON public.job_roles FOR EACH ROW EXECUTE FUNCTION public.guard_linked_job_role();

CREATE FUNCTION public.sync_job_roles(_job uuid,_roles jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE item jsonb; rid uuid; ids uuid[]:='{}'; j public.jobs;
BEGIN
 SELECT * INTO j FROM public.jobs WHERE id=_job FOR UPDATE;
 IF NOT FOUND OR NOT public.owns_company(j.company_id) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 IF EXISTS(SELECT 1 FROM public.companies WHERE id=j.company_id AND blocked) THEN RAISE EXCEPTION 'Sistema bloqueado'; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(_roles) LOOP
  rid:=nullif(item->>'id','')::uuid;
  IF rid IS NULL THEN
   INSERT INTO public.job_roles(job_id,label,category_id,positions,pay_amount,entry_time) VALUES(_job,item->>'label',nullif(item->>'category_id','')::uuid,(item->>'positions')::integer,(item->>'pay_amount')::numeric,nullif(item->>'entry_time','')::time) RETURNING id INTO rid;
  ELSE
   UPDATE public.job_roles SET label=item->>'label',category_id=nullif(item->>'category_id','')::uuid,positions=(item->>'positions')::integer,pay_amount=(item->>'pay_amount')::numeric,entry_time=nullif(item->>'entry_time','')::time WHERE id=rid AND job_id=_job;
   IF NOT FOUND THEN RAISE EXCEPTION 'Cargo não pertence a este evento'; END IF;
  END IF;
  ids:=array_append(ids,rid);
 END LOOP;
 DELETE FROM public.job_roles WHERE job_id=_job AND NOT(id=ANY(ids));
END $$;

CREATE FUNCTION public.job_applicants_with_role(_job uuid) RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT to_jsonb(x)||jsonb_build_object('job_role_id',a.job_role_id,'role_label',r.label,'role_pay_amount',coalesce(r.pay_amount,j.pay_amount),'role_starts_at',public.role_starts_at(j.starts_at,r.entry_time),'has_conflict',EXISTS(SELECT 1 FROM public.bookings b WHERE b.professional_id=a.professional_id AND b.status='confirmed' AND b.job_id<>j.id AND tstzrange(b.starts_at,b.ends_at,'[)') && tstzrange(public.role_starts_at(j.starts_at,r.entry_time),j.ends_at,'[)')))
 FROM public.job_applicants(_job) x JOIN public.applications a ON a.id=x.application_id JOIN public.jobs j ON j.id=a.job_id LEFT JOIN public.job_roles r ON r.id=a.job_role_id $$;
CREATE FUNCTION public.job_payment_list_with_role(_job uuid) RETURNS SETOF jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT to_jsonb(x)||jsonb_build_object('role_label',b.role_label) FROM public.job_payment_list(_job) x JOIN public.bookings b ON b.id=x.booking_id $$;

DO $$ DECLARE def text; BEGIN
 SELECT pg_get_functiondef('public.generate_payment_list(uuid)'::regprocedure) INTO def;
 def:=replace(def,'j.pay_amount','coalesce(b.pay_amount,j.pay_amount)'); EXECUTE def;
 SELECT pg_get_functiondef('public.job_payment_list(uuid)'::regprocedure) INTO def;
 def:=replace(def,'j.pay_amount,','coalesce(pay.gross_amount,b.pay_amount,j.pay_amount),'); EXECUTE def;
 SELECT pg_get_functiondef('public.request_payout(uuid)'::regprocedure) INTO def;
 def:=replace(def,'SUM(v_job.pay_amount)','SUM(coalesce(b.pay_amount,v_job.pay_amount))'); EXECUTE def;
END $$;
REVOKE ALL ON FUNCTION public.apply_to_job_role(uuid,uuid,text),public.sync_job_roles(uuid,jsonb),public.job_applicants_with_role(uuid),public.job_payment_list_with_role(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.apply_to_job_role(uuid,uuid,text),public.sync_job_roles(uuid,jsonb),public.job_applicants_with_role(uuid),public.job_payment_list_with_role(uuid) TO authenticated,service_role;