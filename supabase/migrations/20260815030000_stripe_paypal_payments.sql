-- Replace legacy manual payments with provider-verified Stripe and PayPal flows.
DO $$
DECLARE v_order record;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE payment_method = 'ATH_MOVIL'
      AND (payment_status <> 'PENDING' OR status NOT IN ('AWAITING_PAYMENT','CANCELLED'))
  ) THEN
    RAISE EXCEPTION 'processed legacy payment orders require manual migration';
  END IF;
  FOR v_order IN
    SELECT id FROM public.orders
    WHERE payment_method = 'ATH_MOVIL' AND payment_status = 'PENDING' AND status = 'AWAITING_PAYMENT'
  LOOP
    PERFORM public.release_order_inventory(v_order.id);
  END LOOP;
  UPDATE public.orders SET payment_method = NULL, updated_at = now()
    WHERE payment_method = 'ATH_MOVIL' AND status = 'CANCELLED' AND payment_status = 'PENDING';
END $$;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS provider_checkout_id text,
  ADD COLUMN IF NOT EXISTS provider_payment_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_provider_checkout_unique
  ON public.orders(provider_checkout_id)
  WHERE provider_checkout_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS orders_provider_payment_unique
  ON public.orders(provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('STRIPE', 'PAYPAL'));

CREATE OR REPLACE FUNCTION public.create_pending_order_atomic(
  p_email text,
  p_address jsonb,
  p_lines jsonb,
  p_payment_method text,
  p_idempotency_key uuid
) RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_line jsonb;
  v_product products%ROWTYPE;
  v_variant product_variants%ROWTYPE;
  v_qty int;
  v_unit numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_shipping numeric(10,2);
  v_tax_rate numeric := COALESCE(NULLIF(current_setting('app.sales_tax_rate', true), '')::numeric, 0);
  v_shipping_fee numeric := COALESCE(NULLIF(current_setting('app.shipping_fee', true), '')::numeric, 4.99);
  v_free_threshold numeric := COALESCE(NULLIF(current_setting('app.free_shipping_threshold', true), '')::numeric, 50);
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF p_payment_method NOT IN ('STRIPE', 'PAYPAL') THEN RAISE EXCEPTION 'payment method not configured'; END IF;
  IF jsonb_array_length(p_lines) < 1 THEN RAISE EXCEPTION 'empty cart'; END IF;
  SELECT * INTO v_order FROM orders WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF lower(v_order.guest_email) <> lower(p_email) OR v_order.payment_method <> p_payment_method THEN
      RAISE EXCEPTION 'idempotency key conflict';
    END IF;
    RETURN NEXT v_order; RETURN;
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_qty := (v_line->>'quantity')::int;
    IF v_qty < 1 OR v_qty > 25 THEN RAISE EXCEPTION 'invalid quantity'; END IF;
    SELECT * INTO STRICT v_product FROM products
      WHERE id = (v_line->>'product_id')::uuid AND status NOT IN ('OUT_OF_STOCK','COMING_SOON');
    IF v_line->>'variant_id' IS NOT NULL THEN
      SELECT * INTO STRICT v_variant FROM product_variants
        WHERE id = (v_line->>'variant_id')::uuid AND product_id = v_product.id AND active FOR UPDATE;
      IF v_variant.stock_quantity < v_qty THEN RAISE EXCEPTION 'insufficient stock'; END IF;
      v_unit := COALESCE(v_variant.sale_price, v_variant.price, v_product.sale_price, v_product.price);
    ELSE
      RAISE EXCEPTION 'variant required';
    END IF;
    IF COALESCE(v_line->>'custom_text','') <> '' AND NOT v_product.is_customizable THEN
      RAISE EXCEPTION 'customization not allowed';
    END IF;
    v_subtotal := v_subtotal + (v_unit * v_qty);
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id',v_product.id,'variant_id',v_variant.id,'product_name',v_product.name_es,
      'sku',v_variant.sku,'unit_price',v_unit,'quantity',v_qty,'item_total',v_unit*v_qty,
      'custom_text',v_line->>'custom_text','custom_notes',v_line->>'custom_notes'));
  END LOOP;

  v_shipping := CASE WHEN v_subtotal >= v_free_threshold THEN 0 ELSE v_shipping_fee END;
  INSERT INTO orders(order_number, guest_email, status, subtotal, discount, shipping_cost, tax_amount,
    total_amount, currency, shipping_address, shipping_method, payment_status, payment_method, items, idempotency_key)
  VALUES ('MY3D-' || to_char(now(),'YYYY') || '-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),
    lower(p_email), 'AWAITING_PAYMENT', v_subtotal, 0, v_shipping, round(v_subtotal*v_tax_rate,2),
    v_subtotal+v_shipping+round(v_subtotal*v_tax_rate,2), 'USD', p_address, 'STANDARD', 'PENDING',
    p_payment_method, v_items, p_idempotency_key)
  RETURNING * INTO v_order;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_qty := (v_line->>'quantity')::int;
    UPDATE product_variants SET stock_quantity = stock_quantity - v_qty
      WHERE id = (v_line->>'variant_id')::uuid
        AND product_id = (v_line->>'product_id')::uuid
        AND stock_quantity >= v_qty;
    IF NOT FOUND THEN RAISE EXCEPTION 'insufficient stock'; END IF;
  END LOOP;
  RETURN NEXT v_order;
END $$;

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
  UPDATE orders SET provider_checkout_id = p_provider_checkout_id, updated_at = now()
    WHERE id = p_order_id
      AND payment_method = p_payment_method
      AND payment_status = 'PENDING'
      AND status = 'AWAITING_PAYMENT'
      AND (provider_checkout_id IS NULL OR provider_checkout_id = p_provider_checkout_id)
    RETURNING * INTO v_order;
  IF NOT FOUND THEN RAISE EXCEPTION 'order cannot attach payment provider'; END IF;
  RETURN NEXT v_order;
END $$;

CREATE OR REPLACE FUNCTION public.complete_order_payment(
  p_provider_checkout_id text, p_provider_payment_id text, p_amount numeric, p_currency text
) RETURNS SETOF public.orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE provider_checkout_id = p_provider_checkout_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment order not found'; END IF;
  IF v_order.payment_status IN ('PAID','REFUNDED') THEN
    IF v_order.provider_payment_id <> p_provider_payment_id THEN RAISE EXCEPTION 'payment id mismatch'; END IF;
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

CREATE OR REPLACE FUNCTION public.cancel_order_payment(p_provider_checkout_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM orders WHERE provider_checkout_id = p_provider_checkout_id FOR UPDATE;
  IF NOT FOUND OR v_order.status = 'CANCELLED' THEN RETURN; END IF;
  IF v_order.payment_status <> 'PENDING' OR v_order.status <> 'AWAITING_PAYMENT' THEN
    RAISE EXCEPTION 'paid or processed order cannot be cancelled by payment event';
  END IF;
  PERFORM release_order_inventory(v_order.id);
END $$;

CREATE OR REPLACE FUNCTION public.refund_order_payment(
  p_provider_checkout_id text, p_provider_payment_id text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE orders SET payment_status='REFUNDED', status='REFUNDED', updated_at=now()
    WHERE provider_checkout_id=p_provider_checkout_id
      AND provider_payment_id=p_provider_payment_id
      AND payment_status='PAID';
END $$;

REVOKE ALL ON FUNCTION public.create_pending_order_atomic(text,jsonb,jsonb,text,uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.attach_order_payment_provider(uuid,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_order_payment(text,text,numeric,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_order_payment(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refund_order_payment(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_order_atomic(text,jsonb,jsonb,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_order_payment_provider(uuid,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_order_payment(text,text,numeric,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_order_payment(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.refund_order_payment(text,text) TO service_role;
