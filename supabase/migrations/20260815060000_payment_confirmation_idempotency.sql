-- Repeated provider confirmations remain idempotent after partial refunds.
CREATE OR REPLACE FUNCTION public.complete_order_payment(
  p_provider_checkout_id text, p_provider_payment_id text, p_amount numeric, p_currency text
) RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE provider_checkout_id = p_provider_checkout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment order not found'; END IF;
  IF v_order.payment_status IN ('PAID','PARTIALLY_REFUNDED','REFUNDED') THEN
    IF v_order.provider_payment_id <> p_provider_payment_id THEN RAISE EXCEPTION 'payment id mismatch'; END IF;
    IF v_order.total_amount <> round(p_amount,2) OR upper(v_order.currency) <> upper(p_currency) THEN
      RAISE EXCEPTION 'payment amount mismatch';
    END IF;
    RETURN NEXT v_order; RETURN;
  END IF;
  IF v_order.payment_status <> 'PENDING' OR v_order.status <> 'AWAITING_PAYMENT' THEN
    RAISE EXCEPTION 'order is not awaiting payment';
  END IF;
  IF v_order.total_amount <> round(p_amount,2) OR upper(v_order.currency) <> upper(p_currency) THEN
    RAISE EXCEPTION 'payment amount mismatch';
  END IF;
  UPDATE orders SET payment_status='PAID', status='PAID', provider_payment_id=p_provider_payment_id,
    paid_at=now(), updated_at=now()
    WHERE id=v_order.id RETURNING * INTO v_order;
  RETURN NEXT v_order;
END $$;

REVOKE ALL ON FUNCTION public.complete_order_payment(text,text,numeric,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_order_payment(text,text,numeric,text) TO service_role;
