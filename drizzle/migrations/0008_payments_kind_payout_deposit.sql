ALTER TABLE public.payments DROP CONSTRAINT payments_kind_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_kind_check CHECK (kind IN ('service', 'subscription', 'payout_deposit'));