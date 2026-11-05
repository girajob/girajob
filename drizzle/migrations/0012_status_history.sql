CREATE TABLE public.status_history (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  entity text NOT NULL CHECK (entity IN ('application','job')),
  entity_id uuid NOT NULL,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX status_history_entity_idx ON public.status_history(entity, entity_id, created_at);
GRANT SELECT ON public.status_history TO authenticated;
GRANT ALL ON public.status_history TO service_role;
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ver histórico relacionado" ON public.status_history FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(),'admin')
  OR (entity='application' AND EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id=a.job_id
       WHERE a.id=entity_id AND (a.professional_id=auth.uid() OR public.owns_company(j.company_id))))
  OR (entity='job' AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id=entity_id AND public.owns_company(j.company_id)))
);

CREATE OR REPLACE FUNCTION public.log_status_change() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' OR NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.status_history(entity, entity_id, from_status, to_status, changed_by)
    VALUES (TG_ARGV[0], NEW.id, CASE WHEN TG_OP='UPDATE' THEN OLD.status::text END, NEW.status::text, auth.uid());
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER applications_status_history AFTER INSERT OR UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change('application');
CREATE TRIGGER jobs_status_history AFTER INSERT OR UPDATE OF status ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.log_status_change('job');

INSERT INTO public.status_history(entity, entity_id, to_status, created_at)
  SELECT 'application', id, status::text, created_at FROM public.applications;
INSERT INTO public.status_history(entity, entity_id, to_status, created_at)
  SELECT 'job', id, status::text, created_at FROM public.jobs;