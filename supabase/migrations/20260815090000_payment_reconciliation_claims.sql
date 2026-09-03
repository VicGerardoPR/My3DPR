-- Claim expired reservations in durable batches so one failing provider
-- record cannot starve later inventory releases.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_reconcile_after timestamptz,
  ADD COLUMN IF NOT EXISTS payment_reconcile_attempts integer NOT NULL DEFAULT 0
    CHECK (payment_reconcile_attempts >= 0);

CREATE INDEX IF NOT EXISTS orders_payment_reconcile_queue_idx
  ON public.orders(payment_reconcile_after, payment_expires_at)
  WHERE status = 'AWAITING_PAYMENT' AND payment_status = 'PENDING';

UPDATE public.orders
SET payment_reconcile_after = COALESCE(payment_reconcile_after, payment_expires_at, now())
WHERE status = 'AWAITING_PAYMENT'
  AND payment_status = 'PENDING'
  AND payment_reconcile_after IS NULL;

CREATE OR REPLACE FUNCTION public.claim_expired_payment_orders(p_limit integer DEFAULT 50)
RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'invalid reconciliation batch size';
  END IF;

  RETURN QUERY
  WITH claimed AS (
    SELECT o.id
    FROM public.orders o
    WHERE o.status = 'AWAITING_PAYMENT'
      AND o.payment_status = 'PENDING'
      AND o.payment_expires_at <= now()
      AND COALESCE(o.payment_reconcile_after, o.payment_expires_at) <= now()
    ORDER BY COALESCE(o.payment_reconcile_after, o.payment_expires_at), o.id
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  )
  UPDATE public.orders o
  SET payment_reconcile_attempts = o.payment_reconcile_attempts + 1,
      payment_reconcile_after = now() + interval '5 minutes' * least(o.payment_reconcile_attempts + 1, 12),
      updated_at = now()
  FROM claimed
  WHERE o.id = claimed.id
  RETURNING o.*;
END $$;

REVOKE ALL ON FUNCTION public.claim_expired_payment_orders(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_expired_payment_orders(integer) TO service_role;
