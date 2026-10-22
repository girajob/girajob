-- Dados bancários do profissional: chave Pix e tipo (para o contratante pagar)
ALTER TABLE public.profiles ADD COLUMN pix_key text;
ALTER TABLE public.profiles ADD COLUMN pix_key_type text CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random'));

-- A lista de pagamento passa a mostrar a chave Pix de cada contratado (só o dono da vaga/admin acessam)
DROP FUNCTION public.job_payment_list(uuid);
CREATE FUNCTION public.job_payment_list(_job uuid)
RETURNS TABLE(booking_id uuid, professional_name text, booking_status booking_status, checked_in_at timestamp with time zone, gross numeric, payment_id uuid, payment_status text, fee numeric, net numeric, pro_fee numeric, contractor_fee numeric, total_charge numeric, pix_key text, pix_key_type text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare j public.jobs;
begin
  select * into j from public.jobs where id=_job;
  if not found or not (public.owns_company(j.company_id) or public.has_role(auth.uid(),'admin')) then raise exception 'Sem permissão'; end if;
  return query
  select b.id, coalesce(p.full_name,'Profissional'), b.status, b.checked_in_at, j.pay_amount,
    pay.id, pay.status, pay.fee_amount, pay.net_amount, pay.pro_fee_amount, pay.contractor_fee_amount, pay.total_charge,
    p.pix_key, p.pix_key_type
  from public.bookings b
  join public.profiles p on p.id=b.professional_id
  left join public.payments pay on pay.booking_id=b.id and pay.kind='service'
  where b.job_id=_job and b.status in ('confirmed','completed')
  order by p.full_name;
end $function$;