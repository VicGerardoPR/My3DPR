-- Customer accounts, ownership and verified guest-order access.
ALTER TABLE orders
  ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_guest_email_lower ON orders(lower(guest_email));

DROP POLICY IF EXISTS "Users see own orders" ON orders;
CREATE POLICY "Verified customers see own orders" ON orders FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR (guest_email IS NOT NULL AND lower(guest_email) = lower(COALESCE(auth.jwt()->>'email', '')))
);

ALTER TABLE custom_requests DROP CONSTRAINT IF EXISTS custom_requests_user_id_fkey;
ALTER TABLE custom_requests ADD CONSTRAINT custom_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_custom_requests_user_id ON custom_requests(user_id);
DROP POLICY IF EXISTS "Users see own requests" ON custom_requests;
CREATE POLICY "Verified customers see own requests" ON custom_requests FOR SELECT TO authenticated USING (
  user_id = auth.uid()
  OR lower(customer_email) = lower(COALESCE(auth.jwt()->>'email', ''))
);

-- Preserve the existing five-argument checkout implementation while adding
-- authenticated ownership. The wrapper executes in the same DB transaction.
CREATE OR REPLACE FUNCTION create_pending_order_atomic(
  p_email text,
  p_address jsonb,
  p_lines jsonb,
  p_payment_method text,
  p_idempotency_key uuid,
  p_user_id uuid
) RETURNS SETOF orders
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_order orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order FROM create_pending_order_atomic(
    p_email, p_address, p_lines, p_payment_method, p_idempotency_key
  );
  IF p_user_id IS NOT NULL THEN
    UPDATE orders SET user_id = p_user_id
    WHERE id = v_order.id AND lower(guest_email) = lower(p_email)
    RETURNING * INTO v_order;
  END IF;
  RETURN NEXT v_order;
END $$;
REVOKE ALL ON FUNCTION create_pending_order_atomic(text,jsonb,jsonb,text,uuid,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_pending_order_atomic(text,jsonb,jsonb,text,uuid,uuid) TO service_role;
