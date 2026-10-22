-- Cargos de um mesmo evento: cada um com categoria, quantidade, valor e horário de entrada
CREATE TABLE public.job_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.professional_categories(id),
  label text NOT NULL,
  positions integer NOT NULL DEFAULT 1 CHECK (positions > 0),
  pay_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (pay_amount >= 0),
  entry_time time,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_roles TO authenticated;
GRANT ALL ON public.job_roles TO service_role;
ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;
-- Leitura acompanha a visibilidade da vaga (publicada = profissionais veem; dono vê as suas)
CREATE POLICY "read roles of visible jobs" ON public.job_roles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id));
-- Somente o dono da empresa da vaga gerencia os cargos
CREATE POLICY "owner manages roles" ON public.job_roles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND public.owns_company(j.company_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_id AND public.owns_company(j.company_id)));