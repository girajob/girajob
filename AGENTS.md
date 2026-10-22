<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Critical business actions (apply, hire, status changes, QR verify, admin stats) live in SECURITY DEFINER SQL functions called via supabase.rpc — they enforce permissions, conflicts and concurrency server-side.
- Roles live only in public.user_roles; admin is granted manually server-side, never from the UI.
- All uploaded files use private buckets (`media`, `documents`) with signed URLs, because the workspace blocks public buckets.
- Signed-in areas live under src/routes/_authenticated/{profissional,contratante,admin} with a role check in each layout's beforeLoad.
- Contractor analytics: event_revenues stores contractor-entered revenue per job (add/delete via RPCs); contractor_events_report() aggregates hires, check-ins, labor cost, revenue and balance per event. Address/CNPJ autofill uses public ViaCEP/BrasilAPI from src/lib/br-lookup.ts (client-side, no secrets).
- Check-in and payment lists: check_in_booking validates the QR token and stamps bookings.checked_in_at; generate_payment_list creates kind='service' payments only for checked-in bookings, idempotent via idempotency_key 'job:<job>:<booking>'. Platform fees live in platform_settings: 'service_fee_pct' (default 10, deducted from the professional) and 'contractor_fee_pct' (default 0, added to the contractor's charge), admin-only via set_platform_setting. payments.pro_fee_amount/contractor_fee_amount/total_charge store the split; admin_revenue_report(_from,_to) powers the admin revenue report. No real charges until a payment provider is integrated — payments stay 'pending'.
- Pricing and sellers: price_catalog holds what each company charges (owner + assigned seller can edit; admin reads). app_role includes 'seller'; admin grants roles via set_user_role. Sellers register companies (companies.seller_id = seller) and negotiate pricing for them.
- Client blocking: companies.blocked/blocked_reason, set only by admin via set_company_blocked. Blocked companies cannot insert/update jobs (RLS) nor publish (guard_blocked_company trigger raises company_blocked); the contractor layout shows a "Sistema bloqueado" banner directing to GiraJob support. admin_client_status() powers the admin Clients page (adimplente/inadimplente); admin_new_registrations(_days) powers the Cadastros page.
- GiraJob-paid jobs: jobs.payer is 'company' (default) or 'girajob'. For 'girajob' jobs the contractor calls request_payout(_job), which creates one kind='payout_deposit' payment (idempotency_key 'payout:<job>') for gross + contractor fee. payment_instructions(_payment) returns the Pix key and boleto text from platform_settings keys 'pix_key'/'boleto_instructions' (admin-configured in Financeiro) plus reference GIRAJOB-<payment id prefix>.
- Multi-role events: job_roles rows belong to a job (label, category, positions, pay_amount, entry_time). The job form syncs them by delete + re-insert on every save; read access follows the parent job's visibility. Applications and payments remain at job level — per-role application/hiring is a future step.
- Professional payout data: profiles.pix_key/pix_key_type are self-editable in the onboarding wizard (step 1) and only leave the database through job_payment_list (owner/admin-only security definer) — never expose them in applicant lists or public profile reads.
