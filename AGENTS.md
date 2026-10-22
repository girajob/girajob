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
- Check-in and payment lists: check_in_booking validates the QR token and stamps bookings.checked_in_at; generate_payment_list creates kind='service' payments only for checked-in bookings, idempotent via idempotency_key 'job:<job>:<booking>'. Platform fee % lives in platform_settings ('service_fee_pct', default 10), admin-only via set_platform_setting. No real charges until a payment provider is integrated — payments stay 'pending'.
