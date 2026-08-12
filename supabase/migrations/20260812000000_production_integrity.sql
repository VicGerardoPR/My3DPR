-- Production integrity hardening for checkout, variant inventory and private data.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE products ADD CONSTRAINT products_price_nonnegative CHECK (price >= 0);
ALTER TABLE products ADD CONSTRAINT products_sale_price_nonnegative CHECK (sale_price IS NULL OR sale_price >= 0);
ALTER TABLE products ALTER COLUMN rating DROP DEFAULT;
ALTER TABLE products ALTER COLUMN rating DROP NOT NULL;
ALTER TABLE product_variants ADD CONSTRAINT variants_stock_nonnegative CHECK (stock_quantity >= 0);
ALTER TABLE product_variants ADD CONSTRAINT variants_price_nonnegative CHECK (price IS NULL OR price >= 0);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key uuid UNIQUE;
ALTER TABLE orders ADD CONSTRAINT orders_amounts_nonnegative CHECK (subtotal >= 0 AND discount >= 0 AND shipping_cost >= 0 AND tax_amount >= 0 AND total_amount >= 0);
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('PENDING','AWAITING_PAYMENT','PAID','PROCESSING','PRINTING','READY_TO_SHIP','SHIPPED','DELIVERED','CANCELLED','REFUNDED','FAILED'));
ALTER TABLE custom_requests ADD CONSTRAINT custom_request_quantity_positive CHECK (quantity > 0);
ALTER TABLE box_templates ADD CONSTRAINT box_item_count_positive CHECK (required_item_count > 0);
ALTER TABLE box_templates ADD CONSTRAINT box_price_nonnegative CHECK (base_price >= 0 AND bundle_discount_percent BETWEEN 0 AND 100);

ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Product images public read" ON product_images;
CREATE POLICY "Product images public read" ON product_images FOR SELECT USING (
  EXISTS (SELECT 1 FROM products p WHERE p.id = product_images.product_id AND p.status NOT IN ('COMING_SOON'))
);
DROP POLICY IF EXISTS "Product variants public read" ON product_variants;
CREATE POLICY "Product variants public read" ON product_variants FOR SELECT USING (
  active AND EXISTS (SELECT 1 FROM products p WHERE p.id = product_variants.product_id AND p.status NOT IN ('COMING_SOON'))
);
DROP POLICY IF EXISTS "Anyone can create order" ON orders;
DROP POLICY IF EXISTS "Anyone can submit custom request" ON custom_requests;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('customer-designs', 'customer-designs', false, 20971520, ARRAY['application/zip','application/octet-stream','model/stl','model/3mf','text/plain'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION create_pending_order_atomic(
  p_email text,
  p_address jsonb,
  p_lines jsonb,
  p_payment_method text,
  p_idempotency_key uuid
) RETURNS SETOF orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
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
  IF p_payment_method <> 'ATH_MOVIL' THEN RAISE EXCEPTION 'payment method not configured'; END IF;
  IF jsonb_array_length(p_lines) < 1 THEN RAISE EXCEPTION 'empty cart'; END IF;
  SELECT * INTO v_order FROM orders WHERE idempotency_key = p_idempotency_key;
  IF FOUND THEN RETURN NEXT v_order; RETURN; END IF;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_qty := (v_line->>'quantity')::int;
    IF v_qty < 1 OR v_qty > 25 THEN RAISE EXCEPTION 'invalid quantity'; END IF;
    SELECT * INTO STRICT v_product FROM products WHERE id = (v_line->>'product_id')::uuid AND status NOT IN ('OUT_OF_STOCK','COMING_SOON');
    IF v_line->>'variant_id' IS NOT NULL THEN
      SELECT * INTO STRICT v_variant FROM product_variants WHERE id = (v_line->>'variant_id')::uuid AND product_id = v_product.id AND active FOR UPDATE;
      IF v_variant.stock_quantity < v_qty THEN RAISE EXCEPTION 'insufficient stock'; END IF;
      v_unit := COALESCE(v_variant.sale_price, v_variant.price, v_product.sale_price, v_product.price);
    ELSE
      RAISE EXCEPTION 'variant required';
    END IF;
    IF COALESCE(v_line->>'custom_text','') <> '' AND NOT v_product.is_customizable THEN RAISE EXCEPTION 'customization not allowed'; END IF;
    v_subtotal := v_subtotal + (v_unit * v_qty);
    v_items := v_items || jsonb_build_array(jsonb_build_object('product_id',v_product.id,'variant_id',v_variant.id,'product_name',v_product.name_es,'sku',v_variant.sku,'unit_price',v_unit,'quantity',v_qty,'item_total',v_unit*v_qty,'custom_text',v_line->>'custom_text','custom_notes',v_line->>'custom_notes'));
  END LOOP;

  v_shipping := CASE WHEN v_subtotal >= v_free_threshold THEN 0 ELSE v_shipping_fee END;
  INSERT INTO orders(order_number, guest_email, status, subtotal, discount, shipping_cost, tax_amount, total_amount, currency, shipping_address, shipping_method, payment_status, payment_method, items, idempotency_key)
  VALUES ('MY3D-' || to_char(now(),'YYYY') || '-' || upper(substr(encode(gen_random_bytes(6),'hex'),1,8)), lower(p_email), 'AWAITING_PAYMENT', v_subtotal, 0, v_shipping, round(v_subtotal*v_tax_rate,2), v_subtotal+v_shipping+round(v_subtotal*v_tax_rate,2), 'USD', p_address, 'STANDARD', 'PENDING', p_payment_method, v_items, p_idempotency_key)
  RETURNING * INTO v_order;

  -- Reserve inventory atomically with order creation. Any exception rolls back
  -- both the order and every decrement, preventing partial reservations.
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_qty := (v_line->>'quantity')::int;
    UPDATE product_variants
       SET stock_quantity = stock_quantity - v_qty
     WHERE id = (v_line->>'variant_id')::uuid
       AND product_id = (v_line->>'product_id')::uuid
       AND stock_quantity >= v_qty;
    IF NOT FOUND THEN RAISE EXCEPTION 'insufficient stock'; END IF;
  END LOOP;

  RETURN NEXT v_order;
END $$;

CREATE OR REPLACE FUNCTION release_order_inventory(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order orders%ROWTYPE; v_item jsonb;
BEGIN
  SELECT * INTO STRICT v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF v_order.status NOT IN ('AWAITING_PAYMENT','FAILED') THEN
    RAISE EXCEPTION 'order inventory cannot be released from current state';
  END IF;
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_order.items) LOOP
    UPDATE product_variants
       SET stock_quantity = stock_quantity + (v_item->>'quantity')::int
     WHERE id = (v_item->>'variant_id')::uuid;
  END LOOP;
  UPDATE orders SET status = 'CANCELLED', updated_at = now() WHERE id = p_order_id;
END $$;
REVOKE ALL ON FUNCTION release_order_inventory(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION release_order_inventory(uuid) TO service_role;
REVOKE ALL ON FUNCTION create_pending_order_atomic(text,jsonb,jsonb,text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_pending_order_atomic(text,jsonb,jsonb,text,uuid) TO service_role;
