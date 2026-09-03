-- Make refund application idempotent inside the order transaction.
CREATE TABLE IF NOT EXISTS public.payment_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('STRIPE','PAYPAL')),
  event_id text NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider_payment_id text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL,
  cumulative boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider,event_id)
);
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_refunds FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.payment_refunds TO service_role;

DROP FUNCTION IF EXISTS public.record_order_refund(text,numeric,text,boolean);
CREATE OR REPLACE FUNCTION public.record_order_refund(
  p_provider text,
  p_event_id text,
  p_provider_payment_id text,
  p_refund_amount numeric,
  p_currency text,
  p_is_cumulative boolean
) RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order orders%ROWTYPE; v_refunded numeric(10,2);
BEGIN
  IF p_provider NOT IN ('STRIPE','PAYPAL') OR COALESCE(p_event_id,'')='' THEN
    RAISE EXCEPTION 'invalid refund event';
  END IF;
  SELECT * INTO v_order FROM orders WHERE provider_payment_id=p_provider_payment_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'refund payment not found'; END IF;

  IF EXISTS (SELECT 1 FROM payment_refunds WHERE provider=p_provider AND event_id=p_event_id) THEN
    RETURN NEXT v_order; RETURN;
  END IF;
  IF v_order.payment_status NOT IN ('PAID','PARTIALLY_REFUNDED','REFUNDED') THEN
    RAISE EXCEPTION 'payment is not refundable';
  END IF;
  IF p_refund_amount <= 0 OR upper(v_order.currency) <> upper(p_currency) THEN
    RAISE EXCEPTION 'invalid refund amount or currency';
  END IF;

  v_refunded := round(CASE WHEN p_is_cumulative THEN greatest(v_order.refunded_amount,p_refund_amount)
                           ELSE v_order.refunded_amount+p_refund_amount END,2);
  IF v_refunded > v_order.total_amount THEN RAISE EXCEPTION 'refund exceeds payment'; END IF;

  INSERT INTO payment_refunds(provider,event_id,order_id,provider_payment_id,amount,currency,cumulative)
    VALUES (p_provider,p_event_id,v_order.id,p_provider_payment_id,p_refund_amount,upper(p_currency),p_is_cumulative);
  UPDATE orders SET
    refunded_amount=v_refunded,
    payment_status=CASE WHEN v_refunded=v_order.total_amount THEN 'REFUNDED' ELSE 'PARTIALLY_REFUNDED' END,
    status=CASE WHEN v_refunded=v_order.total_amount THEN 'REFUNDED' ELSE status END,
    updated_at=now()
  WHERE id=v_order.id RETURNING * INTO v_order;
  RETURN NEXT v_order;
END $$;

REVOKE ALL ON FUNCTION public.record_order_refund(text,text,text,numeric,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_order_refund(text,text,text,numeric,text,boolean) TO service_role;
