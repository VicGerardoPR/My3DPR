-- Every reservation gets a durable TTL before any external provider call.
CREATE OR REPLACE FUNCTION public.ensure_order_payment_expiry()
RETURNS trigger
LANGUAGE plpgsql SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'AWAITING_PAYMENT' AND NEW.payment_status = 'PENDING'
     AND NEW.payment_expires_at IS NULL THEN
    NEW.payment_expires_at := CASE NEW.payment_method
      WHEN 'STRIPE' THEN now() + interval '35 minutes'
      WHEN 'PAYPAL' THEN now() + interval '3 hours 15 minutes'
      ELSE NULL
    END;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS orders_payment_expiry_before_insert ON public.orders;
CREATE TRIGGER orders_payment_expiry_before_insert
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.ensure_order_payment_expiry();

UPDATE public.orders
SET payment_expires_at = now(), updated_at = now()
WHERE status = 'AWAITING_PAYMENT'
  AND payment_status = 'PENDING'
  AND payment_method IN ('STRIPE','PAYPAL')
  AND payment_expires_at IS NULL;

REVOKE ALL ON FUNCTION public.ensure_order_payment_expiry() FROM PUBLIC, anon, authenticated;