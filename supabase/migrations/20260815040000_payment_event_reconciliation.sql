-- Durable webhook idempotency, partial refunds and reservation expiry.
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refunded_amount numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_expires_at timestamptz;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('PENDING','PAID','PARTIALLY_REFUNDED','FAILED','REFUNDED'));
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_refunded_amount_valid;
ALTER TABLE public.orders ADD CONSTRAINT orders_refunded_amount_valid
  CHECK (refunded_amount >= 0 AND refunded_amount <= total_amount);
CREATE INDEX IF NOT EXISTS orders_payment_expiry_pending
  ON public.orders(payment_expires_at)
  WHERE payment_status = 'PENDING' AND status = 'AWAITING_PAYMENT';

CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('STRIPE','PAYPAL')),
  event_id text NOT NULL,
  event_type text NOT NULL,
  status text NOT NULL CHECK (status IN ('PROCESSING','PROCESSED','FAILED')),
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE(provider,event_id)
);
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payment_events TO service_role;

CREATE OR REPLACE FUNCTION public.attach_order_payment_provider(
  p_order_id uuid, p_payment_method text, p_provider_checkout_id text
) RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order orders%ROWTYPE;
BEGIN
  IF p_payment_method NOT IN ('STRIPE','PAYPAL') OR COALESCE(p_provider_checkout_id,'') = '' THEN
    RAISE EXCEPTION 'invalid payment provider';
  END IF;
  UPDATE orders SET
      provider_checkout_id = p_provider_checkout_id,
      payment_expires_at = CASE p_payment_method
        WHEN 'STRIPE' THEN now() + interval '35 minutes'
        WHEN 'PAYPAL' THEN now() + interval '3 hours 15 minutes'
      END,
      updated_at = now()
    WHERE id = p_order_id
      AND payment_method = p_payment_method
      AND payment_status = 'PENDING'
      AND status = 'AWAITING_PAYMENT'
      AND (provider_checkout_id IS NULL OR provider_checkout_id = p_provider_checkout_id)
    RETURNING * INTO v_order;
  IF NOT FOUND THEN RAISE EXCEPTION 'order cannot attach payment provider'; END IF;
  RETURN NEXT v_order;
END $$;

CREATE OR REPLACE FUNCTION public.claim_payment_event(
  p_provider text, p_event_id text, p_event_type text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_claimed uuid;
BEGIN
  IF p_provider NOT IN ('STRIPE','PAYPAL') OR COALESCE(p_event_id,'') = '' OR COALESCE(p_event_type,'') = '' THEN
    RAISE EXCEPTION 'invalid payment event';
  END IF;
  INSERT INTO payment_events(provider,event_id,event_type,status)
    VALUES (p_provider,p_event_id,p_event_type,'PROCESSING')
    ON CONFLICT (provider,event_id) DO NOTHING
    RETURNING id INTO v_claimed;
  IF FOUND THEN RETURN true; END IF;

  UPDATE payment_events SET status='PROCESSING', last_error=NULL, updated_at=now()
    WHERE provider=p_provider AND event_id=p_event_id
      AND (status='FAILED' OR (status='PROCESSING' AND updated_at < now() - interval '5 minutes'))
    RETURNING id INTO v_claimed;
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.finish_payment_event(
  p_provider text, p_event_id text, p_success boolean, p_error text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE payment_events SET
    status=CASE WHEN p_success THEN 'PROCESSED' ELSE 'FAILED' END,
    last_error=CASE WHEN p_success THEN NULL ELSE left(COALESCE(p_error,'processing failed'),500) END,
    processed_at=CASE WHEN p_success THEN now() ELSE NULL END,
    updated_at=now()
  WHERE provider=p_provider AND event_id=p_event_id AND status='PROCESSING';
  IF NOT FOUND THEN RAISE EXCEPTION 'payment event is not claimed'; END IF;
END $$;

DROP FUNCTION IF EXISTS public.refund_order_payment(text,text);
CREATE OR REPLACE FUNCTION public.record_order_refund(
  p_provider_payment_id text,
  p_refund_amount numeric,
  p_currency text,
  p_is_cumulative boolean
) RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order orders%ROWTYPE; v_refunded numeric(10,2);
BEGIN
  SELECT * INTO v_order FROM orders WHERE provider_payment_id=p_provider_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund payment not found'; END IF;
  IF v_order.payment_status NOT IN ('PAID','PARTIALLY_REFUNDED','REFUNDED') THEN
    RAISE EXCEPTION 'payment is not refundable';
  END IF;
  IF p_refund_amount <= 0 OR upper(v_order.currency) <> upper(p_currency) THEN
    RAISE EXCEPTION 'invalid refund amount or currency';
  END IF;
  v_refunded := round(CASE WHEN p_is_cumulative THEN greatest(v_order.refunded_amount,p_refund_amount)
                           ELSE v_order.refunded_amount+p_refund_amount END,2);
  IF v_refunded > v_order.total_amount THEN RAISE EXCEPTION 'refund exceeds payment'; END IF;
  UPDATE orders SET
    refunded_amount=v_refunded,
    payment_status=CASE WHEN v_refunded=v_order.total_amount THEN 'REFUNDED' ELSE 'PARTIALLY_REFUNDED' END,
    status=CASE WHEN v_refunded=v_order.total_amount THEN 'REFUNDED' ELSE status END,
    updated_at=now()
  WHERE id=v_order.id RETURNING * INTO v_order;
  RETURN NEXT v_order;
END $$;

REVOKE ALL ON FUNCTION public.claim_payment_event(text,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_payment_event(text,text,boolean,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_order_refund(text,numeric,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payment_event(text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_payment_event(text,text,boolean,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_order_refund(text,numeric,text,boolean) TO service_role;
