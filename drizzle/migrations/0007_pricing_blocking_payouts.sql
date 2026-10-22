-- 1. Empresa: vendedor responsável e bloqueio por inadimplência
ALTER TABLE public.companies ADD COLUMN seller_id uuid REFERENCES public.profiles(id);
ALTER TABLE public.companies ADD COLUMN blocked boolean NOT NULL DEFAULT false;
ALTER TABLE public.companies ADD COLUMN blocked_reason text;

-- Vendedor cadastra empresas (dono = contratante) e negocia com as que cadastrou
CREATE POLICY "seller inserts company" ON public.companies FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'seller') AND seller_id = auth.uid());
CREATE POLICY "seller updates company" ON public.companies FOR UPDATE TO authenticated
  USING (seller_id = auth.uid() AND public.has_role(auth.uid(), 'seller'))
  WITH CHECK (seller_id = auth.uid());

-- 2. Catálogo de preços do contratante (o que ele cobra / o que foi negociado)
CREATE TABLE public.price_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.price_catalog TO authenticated;
GRANT ALL ON public.price_catalog TO service_role;
ALTER TABLE public.price_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages price catalog" ON public.price_catalog FOR ALL TO authenticated
  USING (public.owns_company(company_id) OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.owns_company(company_id));
CREATE POLICY "seller manages price catalog" ON public.price_catalog FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'seller') AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.seller_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'seller') AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.seller_id = auth.uid()));
CREATE TRIGGER price_catalog_touch BEFORE UPDATE ON public.price_catalog FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Vaga: quem paga os contratados (empresa ou GiraJob)
ALTER TABLE public.jobs ADD COLUMN payer text NOT NULL DEFAULT 'company' CHECK (payer IN ('company', 'girajob'));

-- 4. Empresa bloqueada não publica nem edita vagas
CREATE OR REPLACE FUNCTION public.guard_blocked_company() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('published', 'paused', 'filled')
     AND EXISTS (SELECT 1 FROM public.companies c WHERE c.id = NEW.company_id AND c.blocked) THEN
    RAISE EXCEPTION 'company_blocked';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER jobs_guard_blocked BEFORE INSERT OR UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.guard_blocked_company();

DROP POLICY "owner insert jobs" ON public.jobs;
CREATE POLICY "owner insert jobs" ON public.jobs FOR INSERT TO authenticated
  WITH CHECK (public.owns_company(company_id) AND public.has_role(auth.uid(), 'contractor')
    AND NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.blocked));
DROP POLICY "owner update jobs" ON public.jobs;
CREATE POLICY "owner update jobs" ON public.jobs FOR UPDATE TO authenticated
  USING (public.owns_company(company_id) AND NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.blocked))
  WITH CHECK (public.owns_company(company_id) AND NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = company_id AND c.blocked));

-- 5. Admin lê perfis (para tela de novos cadastros)
CREATE POLICY "admin reads profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. Admin concede papel (vendedor, contratante, etc.)
CREATE OR REPLACE FUNCTION public.set_user_role(_user uuid, _role app_role) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user AND role = _role) THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user, _role);
  END IF;
  PERFORM public.write_audit('role_granted', 'user', _user, jsonb_build_object('role', _role));
END $$;

-- 7. Admin bloqueia/desbloqueia empresa (inadimplência)
CREATE OR REPLACE FUNCTION public.set_company_blocked(_company uuid, _blocked boolean, _reason text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.companies SET blocked = _blocked, blocked_reason = CASE WHEN _blocked THEN _reason ELSE NULL END, updated_at = now()
  WHERE id = _company;
  IF NOT FOUND THEN RAISE EXCEPTION 'company_not_found'; END IF;
  PERFORM public.write_audit(CASE WHEN _blocked THEN 'company_blocked' ELSE 'company_unblocked' END, 'company', _company, jsonb_build_object('reason', _reason));
END $$;

-- 8. Admin: novos cadastros (pessoas e empresas) dos últimos N dias
CREATE OR REPLACE FUNCTION public.admin_new_registrations(_days integer DEFAULT 7)
RETURNS TABLE(kind text, id uuid, name text, account_type app_role, city text, state text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT 'profile', p.id, p.full_name, p.account_type, p.city, p.state, p.created_at
  FROM public.profiles p
  WHERE public.has_role(auth.uid(), 'admin') AND p.created_at >= now() - make_interval(days => _days)
  UNION ALL
  SELECT 'company', c.id, c.name, 'contractor'::app_role, c.city, c.state, c.created_at
  FROM public.companies c
  WHERE public.has_role(auth.uid(), 'admin') AND c.created_at >= now() - make_interval(days => _days)
  ORDER BY created_at DESC;
$$;

-- 9. Admin: situação financeira de cada cliente (adimplente/inadimplente, bloqueio)
CREATE OR REPLACE FUNCTION public.admin_client_status()
RETURNS TABLE(company_id uuid, company_name text, owner_name text, owner_email text, city text, state text,
  blocked boolean, blocked_reason text, subscription_status text, subscription_plan text,
  current_period_end timestamptz, pending_amount numeric, paid_total numeric, last_payment_at timestamptz, seller_name text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.name, p.full_name, au.email::text, c.city, c.state, c.blocked, c.blocked_reason,
    s.status, s.plan, s.current_period_end,
    COALESCE(pay.pending_amount, 0), COALESCE(pay.paid_total, 0), pay.last_payment_at, sp.full_name
  FROM public.companies c
  JOIN public.profiles p ON p.id = c.owner_id
  JOIN auth.users au ON au.id = c.owner_id
  LEFT JOIN LATERAL (
    SELECT status, plan, current_period_end FROM public.subscriptions sub
    WHERE sub.company_id = c.id ORDER BY sub.created_at DESC LIMIT 1
  ) s ON true
  LEFT JOIN LATERAL (
    SELECT SUM(total_charge) FILTER (WHERE status = 'pending') AS pending_amount,
           SUM(total_charge) FILTER (WHERE status = 'paid') AS paid_total,
           MAX(created_at) AS last_payment_at
    FROM public.payments pay2 WHERE pay2.company_id = c.id
  ) pay ON true
  LEFT JOIN public.profiles sp ON sp.id = c.seller_id
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY c.created_at DESC;
$$;

-- 10. Contratante pede que a GiraJob pague os contratados: gera cobrança (depósito) do valor total
CREATE OR REPLACE FUNCTION public.request_payout(_job uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
  v_gross numeric;
  v_pct numeric;
  v_total numeric;
  v_id uuid;
  v_key text := 'payout:' || _job::text;
BEGIN
  SELECT * INTO v_job FROM public.jobs WHERE id = _job;
  IF NOT FOUND THEN RAISE EXCEPTION 'job_not_found'; END IF;
  IF NOT public.owns_company(v_job.company_id) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_job.payer <> 'girajob' THEN RAISE EXCEPTION 'job_not_girajob_paid'; END IF;

  SELECT id INTO v_id FROM public.payments WHERE idempotency_key = v_key;
  IF FOUND THEN RETURN v_id; END IF;

  SELECT COALESCE(SUM(v_job.pay_amount), 0) INTO v_gross
  FROM public.bookings b
  WHERE b.job_id = _job AND b.status IN ('confirmed', 'completed');
  IF v_gross <= 0 THEN RAISE EXCEPTION 'no_hires'; END IF;

  v_pct := public.contractor_fee_pct();
  v_total := round(v_gross * (1 + v_pct / 100), 2);

  INSERT INTO public.payments (kind, company_id, gross_amount, fee_amount, net_amount, pro_fee_amount, contractor_fee_amount, total_charge, status, idempotency_key)
  VALUES ('payout_deposit', v_job.company_id, v_gross, 0, v_gross, 0, v_total - v_gross, v_total, 'pending', v_key)
  RETURNING id INTO v_id;

  PERFORM public.write_audit('payout_requested', 'job', _job, jsonb_build_object('payment_id', v_id, 'total', v_total));
  RETURN v_id;
END $$;

-- 11. Instruções de pagamento (chave Pix / boleto) para uma cobrança do contratante
CREATE OR REPLACE FUNCTION public.payment_instructions(_payment uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_pay public.payments%ROWTYPE;
  v_pix text;
  v_boleto text;
BEGIN
  SELECT * INTO v_pay FROM public.payments WHERE id = _payment;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_not_found'; END IF;
  IF NOT (public.owns_company(v_pay.company_id) OR public.has_role(auth.uid(), 'admin')) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT value #>> '{}' INTO v_pix FROM public.platform_settings WHERE key = 'pix_key';
  SELECT value #>> '{}' INTO v_boleto FROM public.platform_settings WHERE key = 'boleto_instructions';
  RETURN jsonb_build_object(
    'payment_id', v_pay.id,
    'amount', v_pay.total_charge,
    'status', v_pay.status,
    'pix_key', COALESCE(v_pix, ''),
    'boleto', COALESCE(v_boleto, ''),
    'reference', 'GIRAJOB-' || upper(substr(v_pay.id::text, 1, 8))
  );
END $$;