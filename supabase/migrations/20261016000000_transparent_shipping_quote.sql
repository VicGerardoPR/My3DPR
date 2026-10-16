-- Freeze the owner-approved shipping rule for new orders: $4.99 below $50,
-- free at $50 and above. The quote RPC uses the same rate and trusted catalog data.

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

  v_shipping := CASE WHEN v_subtotal >= 50 THEN 0 ELSE 4.99 END;
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

CREATE OR REPLACE FUNCTION public.quote_order_totals(p_lines jsonb)
RETURNS TABLE (
  subtotal numeric(10,2),
  shipping_cost numeric(10,2),
  tax_amount numeric(10,2),
  total_amount numeric(10,2),
  currency text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  v_line jsonb;
  v_product products%ROWTYPE;
  v_variant product_variants%ROWTYPE;
  v_qty int;
  v_unit numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_shipping numeric(10,2);
  v_tax_rate numeric := COALESCE(NULLIF(current_setting('app.sales_tax_rate', true), '')::numeric, 0);
BEGIN
  IF p_lines IS NULL OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid cart';
  END IF;
  IF jsonb_array_length(p_lines) < 1 OR jsonb_array_length(p_lines) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid cart size';
  END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_qty := (v_line->>'quantity')::int;
    IF v_qty < 1 OR v_qty > 25 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'invalid quantity';
    END IF;
    SELECT * INTO STRICT v_product FROM products
      WHERE id = (v_line->>'product_id')::uuid AND status NOT IN ('OUT_OF_STOCK','COMING_SOON');
    IF v_line->>'variant_id' IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'variant required';
    END IF;
    SELECT * INTO STRICT v_variant FROM product_variants
      WHERE id = (v_line->>'variant_id')::uuid AND product_id = v_product.id AND active;
    IF v_variant.stock_quantity < v_qty THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'insufficient stock';
    END IF;
    IF COALESCE(v_line->>'custom_text','') <> '' AND NOT v_product.is_customizable THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'customization not allowed';
    END IF;
    v_unit := COALESCE(v_variant.sale_price, v_variant.price, v_product.sale_price, v_product.price);
    IF v_unit IS NULL OR v_unit < 0 THEN
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'invalid product price';
    END IF;
    v_subtotal := v_subtotal + (v_unit * v_qty);
  END LOOP;

  v_subtotal := round(v_subtotal, 2);
  v_shipping := CASE WHEN v_subtotal >= 50 THEN 0 ELSE 4.99 END;
  RETURN QUERY SELECT v_subtotal, v_shipping, round(v_subtotal*v_tax_rate,2),
    v_subtotal+v_shipping+round(v_subtotal*v_tax_rate,2), 'USD'::text;
END $$;

REVOKE ALL ON FUNCTION public.create_pending_order_atomic(text,jsonb,jsonb,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_pending_order_atomic(text,jsonb,jsonb,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.quote_order_totals(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quote_order_totals(jsonb) TO service_role;
